const { ERROR } = require('./constants');
const {
    cloneContext,
    cloneLogs,
    cloneStorage,
    cloneContract,
} = require('./persistence.js');
const {
    uint8ArrayToHex,
    hexToUint8Array,
    extractAddress,
    toBN,
}  = require('./utils.js');

// Uint8Array:
// address, value, storage key

function jsvm(initPersistence, initBlocks, initLogs, Logger) {
    const persistence = initPersistence();
    const blocks = initBlocks();
    const chainlogs = initLogs();

    const transferValue = persistenceApi => (from, to, value) => {
        Logger.get('jsvm').get('transferValue').debug(from, to, value, typeof value);
        const parsedValue = toBN(value);
        const fromBalance = persistenceApi.get(from).balance;
        const toBalance = persistenceApi.get(to).balance;
        Logger.get('jsvm').get('transferValue').debug('---', fromBalance.toString(), toBalance.toString(), parsedValue.toString());
        if (fromBalance.lt(parsedValue)) throw new Error('Not enough balance.');

        persistenceApi.updateBalance(to, toBalance.add(parsedValue));
        persistenceApi.updateBalance(from, fromBalance.sub(parsedValue));
    }

    const call = (txObj, internalCallWrap, asyncResourceWrap, getMemory, getCache) => {
        const txInfo = Object.assign({}, txObj);
        txInfo.origin = txInfo.from;

        Logger.get('jsvm').get('tx').debug('call', txInfo);

        const cache = getCache();
        const clonedContext = cloneContext(cache.context);
        // const clonedLogs = cloneLogs(getCache().logs);
        const persistenceWrap = initPersistence(clonedContext);
        Logger.get('jsvm').get('persistenceWrap').debug(Object.keys(cache.context));
        persistenceWrap._get = persistenceWrap.get;
        persistenceWrap.get = function (account) {
            if (!account) throw new Error('Account not provided');
            const result = persistenceWrap._get(account);
            // if result is not cached
            if (result.empty) {
                Logger.get('jsvm').debug('asyncResourceWrap', account);
                asyncResourceWrap(account);
                // execution stops here
                throw new Error(ERROR.ASYNC_RESOURCE);
            }
            result.getStorageOriginal = (key) => {
                const value = cache.context[account].storage[key];
                if (typeof value === 'undefined') {
                    Logger.get('jsvm').debug('asyncResourceWrap', account, key);
                    // original account, without current changes
                    asyncResourceWrap(cache.context[account], [key]);
                    // execution stops here
                    throw new Error(ERROR.ASYNC_RESOURCE);
                }
                return value;
            }
            result.getStorage = (key) => {
                const value = result.storage[key];
                if (typeof value === 'undefined') {
                    Logger.get('jsvm').debug('asyncResourceWrap', account, key);
                    // original account, without current changes
                    asyncResourceWrap(cache.context[account], [key]);
                    // execution stops here
                    throw new Error(ERROR.ASYNC_RESOURCE);
                }
                return value;
            }
            result.setStorage = (key, value) => {
                const oldvalue = result.storage[key];
                if (typeof oldvalue === 'undefined') {
                    Logger.get('jsvm').debug('asyncResourceWrap', account, key);
                    // original account, without current changes
                    asyncResourceWrap(cache.context[account], [key]);
                    // execution stops here
                    throw new Error(ERROR.ASYNC_RESOURCE);
                }
                result.storage[key] = value;
                persistenceWrap.set(result);
            }
            return result;
        }
        const chainlogsWrap = initLogs(cache.logs);

        // Transfer ether if any
        if (txInfo.value && !toBN(txInfo.value).isZero()) {
            transferValue(persistenceWrap)(txInfo.from, txInfo.to, txInfo.value);
        }

        let lastReturnData = new Uint8Array(0);

        let gas = {
            limit: toBN(txObj.gasLimit || 4000000),
            price: toBN(txObj.gasPrice || 1),
            used: toBN(txInfo.gasUsed || 0),
        }
        const getGas = () => gas;
        const useGas = (gasUnits, addGas = true) => {
            if (addGas) gas.used = gas.used.add(toBN(gasUnits));
            else gas.used = gas.used.sub(toBN(gasUnits));
            if (gas.used.gt(gas.limit)) throw new Error(ERROR.OUT_OF_GAS);
        }
        txInfo.gas = gas;

        const storageWrites = {};
        const storageReads = {};
        const storageRecords = {
            write: (key) => {
                if (!storageWrites[key]) storageWrites[key] = 0;
                storageWrites[key] ++;
                return storageWrites[key];
            },
            read: (key) => {
                if (!storageReads[key]) storageReads[key] = 0;
                storageReads[key] ++;
                return storageReads[key];
            },
        }

        const block = blocks.set();
        let memoryMap;
        const getNewMemory = () => {
            if (!memoryMap) memoryMap = new WebAssembly.Memory({ initial: 2 }); // Size is in pages.
            return memoryMap;
        }
        const getInstance = () => {
            const inst = persistenceWrap.get(txInfo.to);
            // // constructor
            // if (!inst.runtimeCode) return {
            //     runtimeCode: txInfo.data,
            //     storage: {},
            // }
            return inst;
        }

        const getReturnData = () => lastReturnData;
        const setReturnData = (data) => lastReturnData = data || new Uint8Array(0);

        return internalCall(
            txInfo,
            block,
            internalCallWrap,
            persistenceWrap,
            chainlogsWrap,
            transferValue(persistenceWrap),
            getGas,
            useGas,
            getInstance,
            getReturnData,
            setReturnData,
            getCache,
            getMemory || getNewMemory,
            storageRecords,
        );
    }

    const internalCall = (
        txObj,
        block,
        internalCallWrap,
        persistence,
        chainlogs,
        transferValue,
        getGas,
        useGas,
        getInstance,
        getReturnData,
        setReturnData,
        getCache,
        getMemory,
        storageRecords,
    ) => {
        let currentCacheIndex = 0;
        let wordCount = toBN(0);
        let highestMemCost = toBN(0);
        const storageMap = () => getInstance().storage;

        const storeMemory = (bytes, offset, size) => {
            let mem = new Uint8Array(getMemory().buffer);
            for (let i = 0; i < size; i++) {
                mem[offset + i] = bytes[i];
            }
        }
        const loadMemory = (offset, size) => {
            let res = getMemory().buffer.slice(offset, offset + size)
            return new Uint8Array(res);
        }
        const storageStore = (key, value) => {
            Logger.get('jsvm').get('storage').debug('store', key, value);
            key = uint8ArrayToHex(key);
            getInstance().setStorage(key, value);
        }
        const storageLoad = (key) => {
            Logger.get('jsvm').get('storage').debug('load', key);
            key = uint8ArrayToHex(key);
            return getInstance().getStorage(key) || hexToUint8Array('0x0000000000000000000000000000000000000000000000000000000000000000');
        }
        const storageLoadOriginal = (key) => {
            Logger.get('jsvm').get('storage').debug('loadOriginal', key);
            key = uint8ArrayToHex(key);
            return getInstance().getStorageOriginal(key) || hexToUint8Array('0x0000000000000000000000000000000000000000000000000000000000000000');
        }

        const vmapi = {
            // i32ptr is u128
            // 33 methods
                storageRecords,
                memWordCount: function () {
                    return wordCount;
                },
                highestMemCost: function () {
                    return highestMemCost;
                },
                setMemWordCount: function (_wordCount) {
                    wordCount = _wordCount;
                },
                setHighestMemCost: function (_highestMemCost) {
                    highestMemCost = _highestMemCost;
                },
                getMSize: function () {
                    return wordCount.mul(32);
                },
                storeMemory: function (bytes, offset) {
                    Logger.get('jsvm').get('memory').debug('store', bytes, offset);
                    storeMemory(bytes, offset.toNumber(), 32);
                },
                storeMemory8: function (bytes, offset) {
                    storeMemory(bytes, offset.toNumber(), 1);
                },
                loadMemory: function (offset) {
                    Logger.get('jsvm').get('memory').debug('load', offset);
                    return loadMemory(offset.toNumber(), 32);
                },
                useGas: function (amount) {
                    useGas(amount);
                },
                refundGas: function (amount) {
                    // can be negative due to SSTORE EIP2200;
                    if (toBN(amount).isNeg()) useGas(amount.abs());
                    else useGas(amount, false);
                },
                getAddress: function () {
                    const size = 32;
                    const address = new Uint8Array(size);
                    address.set(hexToUint8Array(getInstance().address), size - 20);
                    Logger.get('jsvm').get('getAddress').debug(address);
                    return address;
                },
                getSelfBalance: function () {
                    const balance = vmapi.getExternalBalance(vmapi.getAddress());
                    Logger.get('jsvm').get('getSelfBalance').debug(balance);
                    return balance;
                },
                // result is u128
                getExternalBalance: function (address) {
                    address = extractAddress(address);
                    const size = 32;
                    const balance = new Uint8Array(size);
                    const tightValue = hexToUint8Array(persistence.get(address).balance.toString(16));
                    balance.set(tightValue, size - tightValue.length);
                    Logger.get('jsvm').get('getExternalBalance').debug(address, balance);
                    return balance;
                },
                getBlockHash: function (number) {
                    // TODO proper blockchash
                    return hexToUint8Array(block.hash);
                },
                callDataCopy: function (resultOffset, dataOffset, length) {
                    resultOffset = resultOffset.toNumber();
                    dataOffset = dataOffset.toNumber();
                    const data = txObj.data.slice(dataOffset, dataOffset + length)
                    storeMemory(
                        data,
                        resultOffset,
                        length,
                    );
                    return data;
                },
                // returns i32
                getCallDataSize: function () {
                    return toBN(txObj.data.length);
                },
                callDataLoad: function(dataOffset) {
                    dataOffset = dataOffset.toNumber();
                    const data = txObj.data.slice(dataOffset, dataOffset + 32);
                    const endfill = [...new Array(32 - data.length).keys()].map(v => 0);
                    return new Uint8Array([...data].concat(endfill));
                },
                // result i32 Returns 0 on success, 1 on failure and 2 on revert
                call: function (
                    gas_limit_i64,
                    address,
                    value,
                    dataOffset,
                    dataLength,
                    outputOffset,
                    outputLength,
                ) {
                    dataOffset = dataOffset.toNumber();
                    dataLength = dataLength.toNumber();
                    Logger.get('jsvm').get('call').debug(address, value,dataOffset, dataLength);

                    const data = loadMemory(dataOffset, dataLength);

                    const cache = getCache();
                    const currentData = {
                        gasLimit: gas_limit_i64,
                        to: address,
                        gasPrice: vmapi.getTxGasPrice(),
                        from: vmapi.getAddress(),
                        origin: vmapi.getTxOrigin(),
                        data,
                        value,
                    }
                    const cachedResult = cache.getAndCheck(currentCacheIndex, currentData);

                    Logger.get('jsvm').get('call').debug('cachedResult', cachedResult);

                    if (!cachedResult) {
                        const clonedContext = cloneContext(getCache().context);
                        const clonedLogs = cloneLogs(getCache().logs);
                        internalCallWrap(currentCacheIndex, currentData, clonedContext, clonedLogs);
                        // execution stops here
                        throw new Error(ERROR.ASYNC_CALL);
                    }

                    currentCacheIndex += 1;

                    transferValue(
                        extractAddress(currentData.origin),
                        extractAddress(currentData.to),
                        value,
                    );

                    if (outputOffset && outputLength) {
                        outputOffset = outputOffset.toNumber();
                        outputLength = outputLength.toNumber();
                        storeMemory(cachedResult.result.data, outputOffset, outputLength);
                    }
                    setReturnData(cachedResult.result.data);

                    return toBN(cachedResult.result.success);
                },
                // result i32 Returns 0 on success, 1 on failure and 2 on revert
                // uses the code from address
                // context from current contract
                callCode: function (
                    gas_limit_i64,
                    address,
                    value,
                    dataOffset,
                    dataLength,
                    outputOffset,
                    outputLength,
                ) {
                    dataOffset = dataOffset.toNumber();
                    dataLength = dataLength.toNumber();
                    Logger.get('jsvm').get('callCode').debug(gas_limit_i64, address, value, dataOffset, dataLength);

                    const data = loadMemory(dataOffset, dataLength);
                    const hexaddress = extractAddress(address);
                    const contract = persistence.get(hexaddress);

                    const cache = getCache();
                    const currentData = {
                        gasLimit: gas_limit_i64,
                        to: address,
                        gasPrice: vmapi.getTxGasPrice(),
                        from: vmapi.getAddress(),
                        origin: vmapi.getTxOrigin(),
                        data,
                        value,
                    }
                    const cachedResult = cache.getAndCheck(currentCacheIndex, currentData);

                    Logger.get('jsvm').get('callCode').debug('cachedResult', cachedResult);

                    if (!cachedResult) {
                        const clonedContext = cloneContext(getCache().context);
                        const clonedLogs = cloneLogs(getCache().logs);

                        // use current context for the contract
                        clonedContext[hexaddress] = cloneContract(contract)
                        clonedContext[hexaddress].storage = cloneStorage(storageMap());

                        internalCallWrap(currentCacheIndex, currentData, clonedContext, clonedLogs);
                        // execution stops here
                        throw new Error(ERROR.ASYNC_CALL);
                    }

                    currentCacheIndex += 1;

                    transferValue(
                        extractAddress(currentData.from),  // from this contract
                        extractAddress(currentData.to),
                        value,
                    );

                    if (outputOffset && outputLength) {
                        outputOffset = outputOffset.toNumber();
                        outputLength = outputLength.toNumber();
                        storeMemory(cachedResult.result.data, outputOffset, outputLength);
                    }
                    setReturnData(cachedResult.result.data);

                    return toBN(cachedResult.result.success);
                },
                // result i32 Returns 0 on success, 1 on failure and 2 on revert
                callDelegate: function (
                    gas_limit_i64,
                    address,
                    dataOffset,
                    dataLength,
                    outputOffset,
                    outputLength,
                ) {
                    dataOffset = dataOffset.toNumber();
                    dataLength = dataLength.toNumber();

                    // identical to a message call except the code at the target address is executed in the context of the calling contract
                    // msg.sender and msg.value do not change their values.
                    Logger.get('jsvm').get('callDelegate').debug(gas_limit_i64, address, valueOffset_i32ptr_u128, dataOffset, dataLength);

                    const data = loadMemory(dataOffset, dataLength);
                    const hexaddress = extractAddress(address);
                    const contract = persistence.get(hexaddress);

                    const cache = getCache();
                    const currentData = {
                        gasLimit: gas_limit_i64,
                        to: address,
                        gasPrice: vmapi.getTxGasPrice(),
                        from: txObj.from,
                        origin: vmapi.getTxOrigin(),
                        data,
                        value: txObj.value,
                    }
                    const cachedResult = cache.getAndCheck(currentCacheIndex, currentData);

                    Logger.get('jsvm').get('callDelegate').debug('cachedResult', cachedResult);

                    if (!cachedResult) {
                        const clonedContext = cloneContext(getCache().context);
                        const clonedLogs = cloneLogs(getCache().logs);

                        // use current context for the contract
                        clonedContext[hexaddress] = cloneContract(contract)
                        clonedContext[hexaddress].storage = cloneStorage(storageMap());

                        internalCallWrap(currentCacheIndex, currentData, clonedContext, clonedLogs);
                        // execution stops here
                        throw new Error(ERROR.ASYNC_CALL);
                    }

                    currentCacheIndex += 1;

                    if (outputOffset && outputLength) {
                        outputOffset = outputOffset.toNumber();
                        outputLength = outputLength.toNumber();
                        storeMemory(cachedResult.result.data, outputOffset, outputLength);
                    }
                    setReturnData(cachedResult.result.data);

                    return toBN(cachedResult.result.success);
                },
                // result i32 Returns 0 on success, 1 on failure and 2 on revert
                callStatic: function (
                    gas_limit_i64,
                    address,
                    dataOffset,
                    dataLength,
                    outputOffset,
                    outputLength,
                ) {
                    dataOffset = dataOffset.toNumber();
                    dataLength = dataLength.toNumber();
                    Logger.get('jsvm').get('callStatic').debug(address, dataOffset, dataLength);

                    const data = loadMemory(dataOffset, dataLength);
                    const cache = getCache();
                    const currentData = {
                        gasLimit: gas_limit_i64,
                        gasPrice: vmapi.getTxGasPrice(),
                        to: address,
                        from: vmapi.getAddress(),
                        origin: vmapi.getTxOrigin(),
                        data,
                        value: new Uint8Array(0),
                    }
                    const cachedResult = cache.getAndCheck(currentCacheIndex, currentData);

                    Logger.get('jsvm').get('callStatic').debug('cachedResult', cachedResult);

                    if (!cachedResult) {
                        const clonedContext = cloneContext(getCache().context);
                        const clonedLogs = cloneLogs(getCache().logs);
                        internalCallWrap(currentCacheIndex, currentData, clonedContext, clonedLogs);
                        // execution stops here
                        throw new Error(ERROR.ASYNC_CALL);
                    }

                    currentCacheIndex += 1;

                    if (outputOffset && outputLength) {
                        outputOffset = outputOffset.toNumber();
                        outputLength = outputLength.toNumber();
                        storeMemory(cachedResult.result.data, outputOffset, outputLength);
                    }
                    setReturnData(cachedResult.result.data);

                    return toBN(cachedResult.result.success);
                },
                storageStore: function (key_uint8array, value_uint8array) {
                    storageStore(key_uint8array, value_uint8array);
                },
                storageLoad: function (key_uint8array) {
                    return storageLoad(key_uint8array);
                },
                storageLoadOriginal: function (key_uint8array) {
                    return storageLoadOriginal(key_uint8array);
                },
                getCaller: function () {
                    const size = 32;
                    const address = new Uint8Array(size);
                    address.set(hexToUint8Array(txObj.from), size - 20);
                    return address;
                },
                getCallValue: function () {
                    const size = 32;
                    const value = new Uint8Array(size);
                    const tightValue = hexToUint8Array(txObj.value.toString(16));
                    value.set(tightValue, size - tightValue.length);
                    return value;
                },
                codeCopy: function (resultOffset, codeOffset, length) {
                    resultOffset = resultOffset.toNumber();
                    codeOffset = codeOffset.toNumber();
                    length = length.toNumber();

                    const runtime = getInstance().runtimeCode.slice(codeOffset, codeOffset + length)
                    storeMemory(runtime, resultOffset, length)
                    return runtime;
                },
                // returns i32 - code size current env
                getCodeSize: function() {
                    return toBN(getInstance().runtimeCode.length);
                },
                // block’s beneficiary address
                getBlockCoinbase: function() {
                    const size = 32;
                    const value = new Uint8Array(size);
                    const tightValue = hexToUint8Array(block.coinbase);
                    value.set(tightValue, size - tightValue.length);
                    return value;
                },
                // result i32 Returns 0 on success, 1 on failure and 2 on revert
                create: function (
                    balance,
                    dataOffset,
                    dataLength,
                ) {
                    dataOffset = dataOffset.toNumber();
                    dataLength = dataLength.toNumber();

                    const runtimeCode = loadMemory(dataOffset, dataLength);
                    const address = persistence.set({ runtimeCode, balance: toBN(balance) });
                    Logger.get('jsvm').get('create').debug(address);

                    const size = 32;
                    const addrBytes = new Uint8Array(size);
                    const tightValue = hexToUint8Array(address);
                    addrBytes.set(tightValue, size - tightValue.length);
                    return addrBytes;
                },
                // returns u256
                getBlockDifficulty: function () {
                    const size = 32;
                    const value = new Uint8Array(size);
                    const tightValue = hexToUint8Array(block.difficulty.toString(16));
                    value.set(tightValue, size - tightValue.length);
                    return value;
                },
                externalCodeCopy: function (
                    address, // the memory offset to load the address from (address)
                    resultOffset,
                    codeOffset,
                    dataLength,
                ) {
                    address = extractAddress(address);
                    resultOffset = resultOffset.toNumber();
                    codeOffset = codeOffset.toNumber();
                    dataLength = dataLength.toNumber();

                    Logger.get('jsvm').get('externalCodeCopy').debug(address);
                    const codeSlice = persistence.get(address).runtimeCode.slice(codeOffset, codeOffset + dataLength);
                    storeMemory(codeSlice, resultOffset, dataLength);
                    return codeSlice;
                },
                getExternalCodeHash: function(address) {
                    throw new Error('Not implemented');
                },
                // Returns extCodeSize i32
                getExternalCodeSize: function (address) {
                    address = extractAddress(address);
                    Logger.get('jsvm').get('getExternalCodeSize').debug(address);
                    return toBN(persistence.get(address).runtimeCode.length);
                },
                getGas: getGas,
                getGasLeft: function () {
                    const gas = getGas();
                    return gas.limit.sub(gas.used);
                },
                getBlockGasLimit: function () {
                    return getGas().limit;
                },
                getTxGasPrice: function () {
                    const size = 32;
                    const value = new Uint8Array(size);
                    const tightValue = hexToUint8Array(getGas().price.toString(16));
                    value.set(tightValue, size - tightValue.length);
                    return value;
                },
                log: function (
                    dataOffset,
                    dataLength,
                    numberOfTopics,
                    topics,
                ) {
                    Logger.get('jsvm').get('log').debug(topics);
                    chainlogs.set({
                        address: vmapi.getAddress(),
                        blockNumber: block.number,
                        data: loadMemory(dataOffset.toNumber(), dataLength.toNumber()),
                        topics: topics.slice(0, numberOfTopics),
                    })
                },
                // result blockNumber i64
                getBlockNumber: function () {
                    return toBN(block.number);
                },
                getTxOrigin: function () {
                    const size = 32;
                    const address = new Uint8Array(size);
                    address.set(hexToUint8Array(txObj.origin), size - 20);
                    return address;
                },
                finish: function (dataOffset, dataLength) {
                    return loadMemory(dataOffset.toNumber(), dataLength.toNumber());
                },
                revert: function (dataOffset, dataLength) {
                    return loadMemory(dataOffset.toNumber(), dataLength.toNumber());
                },
                // result dataSize i32
                getReturnDataSize: function () {
                    return toBN(getReturnData().length);
                },
                returnDataCopy: function (resultOffset, dataOffset, length) {
                    resultOffset = resultOffset.toNumber();
                    dataOffset = dataOffset.toNumber();
                    length = length.toNumber();
                    const slice = getReturnData().slice(dataOffset, dataOffset + length);
                    storeMemory(
                        slice,
                        resultOffset,
                        length,
                    );
                    return slice;
                },
                selfDestruct: function (address) {
                    const toAddress = extractAddress(address);
                    const fromAddress = getInstance().address;
                    Logger.get('jsvm').get('selfDestruct').debug(fromAddress, toAddress);
                    transferValue(
                        fromAddress,
                        toAddress,
                        persistence.get(fromAddress).balance,
                    );
                    persistence.remove(fromAddress);
                },
                // result blockTimestamp i64,
                getBlockTimestamp: function () {
                    return toBN(block.timestamp);
                },
                getBlockChainId: function () {
                    return toBN(99);
                },
                stop: function() {
                    return toBN(0);
                },
                transferValue,
        }
        return vmapi;
    }

    const wrappersist = {
        accounts: persistence,
        blocks,
        logs: chainlogs,
    }

    return { persistence: wrappersist, call }

}

module.exports = jsvm;

