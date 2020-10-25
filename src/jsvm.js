const { ERROR } = require('./constants');
const Logger = require('./config');
const {
    persistence: initPersistence,
    blocks: initBlocks,
    logs: initLogs,
    cloneContext,
    cloneLogs,
    cloneStorage,
    cloneContract,
} = require('./persistence.js');
const {
    uint8ArrayToHex,
    hexToUint8Array,
    newi32,
    newi64,
    extractAddress,
    toBN,
}  = require('./utils.js');

function jsvm() {

    const persistence = initPersistence();
    const blocks = initBlocks();
    const chainlogs = initLogs();

    const transferValue = persistenceApi => (from, to, value) => {
        Logger.get('jsvm').get('transferValue').debug(from, to, value, typeof value);
        const parsedValue = toBN(value);
        const fromBalance = persistenceApi.get(from).balance;
        if (fromBalance.lt(parsedValue)) throw new Error('Not enough balance.');

        const toBalance = persistenceApi.get(to).balance;
        persistenceApi.updateBalance(to, toBalance.add(parsedValue));
        persistenceApi.updateBalance(from, fromBalance.sub(parsedValue));
    }

    const call = (txObj, internalCallWrap, asyncResourceWrap, getMemory, getCache) => {
        const txInfo = Object.assign({}, txObj);
        txInfo.origin = txInfo.from;

        Logger.get('jsvm').get('tx').debug('call', txInfo);

        const cache = getCache();
        const persistenceWrap = initPersistence(cache.context);
        Logger.get('jsvm').get('persistenceWrap').debug(Object.keys(cache.context));
        persistenceWrap._get = persistenceWrap.get;
        persistenceWrap.get = (account) => {
            if (!account) throw new Error('Account not provided');
            const result = persistenceWrap._get(account);
            // if result is not cached
            if (result.empty) {
                Logger.get('jsvm').debug('asyncResourceWrap', account);
                asyncResourceWrap(account);
                // execution stops here
                throw new Error(ERROR.ASYNC_RESOURCE);
            }
            return result;
        }
        const chainlogsWrap = initLogs(cache.logs);

        // Transfer ether if any
        if (txInfo.value && !toBN(txInfo.value).isZero()) {
            transferValue(persistenceWrap)(txInfo.from, txInfo.to, txInfo.value);
        }

        let lastReturnData;

        let gas = {
            limit: newi64(txObj.gasLimit || 4000000),
            price: txObj.gasPrice || 1,
            used: newi64(0),
        }
        const getGas = () => gas;
        const useGas = gas => {
            gas.used += gas;
        }
        txInfo.gas = gas;

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
        const setReturnData = (data) => lastReturnData = data;

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
    ) => {
        let currentCacheIndex = 0;
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
            storageMap()[uint8ArrayToHex(key)] = value;
        }
        const storageLoad = (key) => {
            Logger.get('jsvm').get('storage').debug('load', key);
            return storageMap()[uint8ArrayToHex(key)] || hexToUint8Array('0x0000000000000000000000000000000000000000000000000000000000000000');
        }

        const vmapi = {
            // i32ptr is u128
            // 33 methods
                storeMemory: function (bytes, offset) {
                    Logger.get('jsvm').get('memory').debug('store', bytes, offset);
                    storeMemory(bytes, offset, 32);
                },
                storeMemory8: function (bytes, offset) {
                    storeMemory(bytes, offset, 1);
                },
                loadMemory: function (offset) {
                    Logger.get('jsvm').get('memory').debug('load', offset);
                    return loadMemory(offset, 32);
                },
                useGas: function (amount_i64) {
                    useGas(amount_i64);
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
                    return hexToUint8Array(block.hash);
                },
                callDataCopy: function (resultOffset_i32ptr_bytes, dataOffset_i32, length_i32) {
                    storeMemory(
                        txObj.data.slice(dataOffset_i32, dataOffset_i32 + length_i32),
                        resultOffset_i32ptr_bytes,
                        length_i32,
                    );
                },
                // returns i32
                getCallDataSize: function () {
                    return newi32(txObj.data.length);
                },
                callDataLoad: function(dataOffset) {
                    return txObj.data.slice(dataOffset, dataOffset + 32);
                },
                // result i32 Returns 0 on success, 1 on failure and 2 on revert
                call: function (
                    gas_limit_i64,
                    address, // the memory offset to load the address from (address)
                    valueOffset_i32ptr_u128,
                    dataOffset_i32ptr_bytes,
                    dataLength_i32,
                    outputOffset_i32ptr_bytes,
                    outputLength_i32,
                ) {
                    Logger.get('jsvm').get('call').debug(address, dataOffset_i32ptr_bytes, dataLength_i32);

                    const value = loadMemory(valueOffset_i32ptr_u128, 32);
                    const data = loadMemory(dataOffset_i32ptr_bytes, dataLength_i32);

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

                    if (outputOffset_i32ptr_bytes && outputLength_i32) {
                        storeMemory(cachedResult.result.data, outputOffset_i32ptr_bytes, outputLength_i32);
                    }
                    setReturnData(cachedResult.result.data);

                    return newi32(cachedResult.result.success);
                },
                // result i32 Returns 0 on success, 1 on failure and 2 on revert
                // uses the code from address
                // context from current contract
                callCode: function (
                    gas_limit_i64,
                    addressOffset_i32ptr_address, // the memory offset to load the address from (address)
                    valueOffset_i32ptr_u128,
                    dataOffset_i32ptr_bytes,
                    dataLength_i32,
                ) {
                    Logger.get('jsvm').get('callCode').debug(gas_limit_i64, addressOffset_i32ptr_address, valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32);

                    const value = loadMemory(valueOffset_i32ptr_u128, 32);
                    const data = loadMemory(dataOffset_i32ptr_bytes, dataLength_i32);
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

                    Logger.get('jsvm').get('call').debug('cachedResult', cachedResult);

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

                    if (outputOffset_i32ptr_bytes && outputLength_i32) {
                        storeMemory(cachedResult.result.data, outputOffset_i32ptr_bytes, outputLength_i32);
                    }
                    setReturnData(cachedResult.result.data);

                    return newi32(cachedResult.result.success);
                },
                // result i32 Returns 0 on success, 1 on failure and 2 on revert
                callDelegate: function (
                    gas_limit_i64,
                    addressOffset_i32ptr_address,
                    dataOffset_i32ptr_bytes,
                    dataLength_i32,
                ) {
                    // identical to a message call except the code at the target address is executed in the context of the calling contract
                    // msg.sender and msg.value do not change their values.
                    Logger.get('jsvm').get('callCode').debug(gas_limit_i64, addressOffset_i32ptr_address, valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32);

                    const data = loadMemory(dataOffset_i32ptr_bytes, dataLength_i32);
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

                    Logger.get('jsvm').get('call').debug('cachedResult', cachedResult);

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

                    if (outputOffset_i32ptr_bytes && outputLength_i32) {
                        storeMemory(cachedResult.result.data, outputOffset_i32ptr_bytes, outputLength_i32);
                    }
                    setReturnData(cachedResult.result.data);

                    return newi32(cachedResult.result.success);
                },
                // result i32 Returns 0 on success, 1 on failure and 2 on revert
                callStatic: function (
                    gas_limit_i64,
                    address,
                    dataOffset_i32ptr_bytes,
                    dataLength_i32,
                    outputOffset_i32ptr_bytes,
                    outputLength_i32,
                ) {
                    Logger.get('jsvm').get('callStatic').debug(address, dataOffset_i32ptr_bytes, dataLength_i32);

                    const data = loadMemory(dataOffset_i32ptr_bytes, dataLength_i32);

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

                    if (outputOffset_i32ptr_bytes && outputLength_i32) {
                        storeMemory(cachedResult.result.data, outputOffset_i32ptr_bytes, outputLength_i32);
                    }
                    setReturnData(cachedResult.result.data);

                    return newi32(cachedResult.result.success);
                },
                storageStore: function (key_uint8array, value_uint8array) {
                    storageStore(key_uint8array, value_uint8array);
                },
                storageLoad: function (key_uint8array) {
                    return storageLoad(key_uint8array);
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
                codeCopy: function (resultOffset_i32ptr_bytes, codeOffset_i32, length_i32) {
                    const runtime = getInstance().runtimeCode.slice(codeOffset_i32, codeOffset_i32 + length_i32)
                    storeMemory(runtime, resultOffset_i32ptr_bytes, length_i32)
                },
                // returns i32 - code size current env
                getCodeSize: function() {
                    return newi32(getInstance().runtimeCode.length);
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
                getBlockDifficulty: function (resulltOffset_i32ptr_u256) {
                    const size = 32;
                    const value = new Uint8Array(size);
                    const tightValue = hexToUint8Array(block.difficulty.toString(16));
                    value.set(tightValue, size - tightValue.length);
                    return value;
                },
                externalCodeCopy: function (
                    address, // the memory offset to load the address from (address)
                    resultOffset_i32ptr_bytes,
                    codeOffset_i32,
                    dataLength_i32,
                ) {
                    address = extractAddress(address);
                    Logger.get('jsvm').get('externalCodeCopy').debug(address);
                    const codeSlice = persistence.get(address).runtimeCode.slice(codeOffset_i32, codeOffset_i32 + dataLength_i32);
                    storeMemory(codeSlice, resultOffset_i32ptr_bytes, dataLength_i32);
                },
                // Returns extCodeSize i32
                getExternalCodeSize: function (address) {
                    address = extractAddress(address);
                    Logger.get('jsvm').get('getExternalCodeSize').debug(address);
                    return newi32(persistence.get(address).runtimeCode.length);
                },
                // result gasLeft i64
                getGasLeft: function () {
                    const gas = getGas();
                    return newi64(gas.limit - gas.used);
                },
                // result blockGasLimit i64
                getBlockGasLimit: function () {
                    return newi64(block.gasLimit);
                },
                getTxGasPrice: function () {
                    const size = 32;
                    const value = new Uint8Array(size);
                    const tightValue = hexToUint8Array(getGas().price.toString(16));
                    value.set(tightValue, size - tightValue.length);
                    return value;
                },
                log: function (
                    dataOffset_i32ptr_bytes,
                    dataLength_i32,
                    numberOfTopics_i32,
                    topics,
                ) {
                    Logger.get('jsvm').get('log').debug(topics);
                    chainlogs.set({
                        address: vmapi.getAddress(),
                        blockNumber: block.number,
                        data: loadMemory(dataOffset_i32ptr_bytes, dataLength_i32),
                        topics: topics.slice(0, numberOfTopics_i32),
                    })
                },
                // result blockNumber i64
                getBlockNumber: function () {
                    return newi64(block.number);
                },
                getTxOrigin: function () {
                    const size = 32;
                    const address = new Uint8Array(size);
                    address.set(hexToUint8Array(txObj.origin), size - 20);
                    return address;
                },
                finish: function (dataOffset_i32ptr_bytes, dataLength_i32) {
                    return loadMemory(dataOffset_i32ptr_bytes, dataLength_i32);
                },
                revert: function (dataOffset_i32ptr_bytes, dataLength_i32) {
                    return loadMemory(dataOffset_i32ptr_bytes, dataLength_i32);
                },
                // result dataSize i32
                getReturnDataSize: function () {
                    return newi32(getReturnData().length);
                },
                returnDataCopy: function (resultOffset_i32ptr_bytes, dataOffset_i32, length_i32) {
                    storeMemory(
                        getReturnData().slice(dataOffset_i32, dataOffset_i32 + length_i32),
                        resultOffset_i32ptr_bytes,
                        length_i32,
                    );
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
                    return newi64(block.timestamp);
                },
                getBlockChainId: function () {
                    return newi32(99);
                },
                getMSize: function () {
                    return (new Uint8Array(getMemory().buffer)).length;
                },
                stop: function() {
                    return new Uint8Array(0);
                },
                transferValue,
        }
        return vmapi;
    }

    return {
        persistence,
        blocks,
        logs: chainlogs,
        call,
    }

}

module.exports = jsvm;

