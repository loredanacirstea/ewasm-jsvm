const { ethers } = require('ethers');
const {
    persistence: initPersistence,
    blocks: initBlocks,
    logs: initLogs,
} = require('./persistence.js');
const {
    encodeWithSignature,
    encode,
    decode,
    logu8a,
    uint8ArrayToHex,
    hexToUint8Array,
    newi32,
    newi64,
    randomAddress,
    instantiateWasm,
}  = require('./utils.js');

const persistence = initPersistence();
const blocks = initBlocks();
const chainlogs = initLogs();

const deploy = (wasmSource, wabi) => async (...args) => {
    const constructori = await initializeWrap(wasmSource, wabi, null, false);
    // TODO: constructor args
    const txInfo = args[args.length - 1];
    const address = await constructori.main(txInfo);
    const instance = await runtime(address, wabi);
    return instance;
}

const runtime = (address, wabi) => {
    const runtimeCode = persistence.get(address).runtimeCode;
    return initializeWrap(runtimeCode, wabi, address, true);
}

const runtimeSim = (wasmSource, wabi, address) => {
    address = address || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return initializeWrap(wasmSource, wabi, address, true);
}

const initializeWrap =  async (wasmbin, wabi, address, runtime = false) => {
    wasmbin = typeof wasmbin === 'string' ? hexToUint8Array(wasmbin) : wasmbin;
    const storageMap = new WebAssembly.Memory({ initial: 2 }); // Size is in pages.
    const block = blocks.set();
    address = address || randomAddress();

    let currentPromise;

    const transferValue = (from, to, value) => {
        const fromBalance = persistence.get(from).balance;
        if (fromBalance < value) throw new Error('Not enough balance.');
        
        const toBalance = persistence.get(to).balance;
        persistence.updateBalance(to, toBalance + value);
        persistence.updateBalance(from, fromBalance - value);
    }

    const finishAction = answ => {
        if (!currentPromise) throw new Error('No queued promise found.');
        if (currentPromise.name === 'constructor') {
            persistence.set({ runtimeCode: answ, address });
            transferValue(
                currentPromise.txInfo.from,
                address,
                currentPromise.txInfo.value,
            )
            currentPromise.resolve(address);
        } else {
            const decoded = answ ? decode(wabi.find(abi => abi.name === currentPromise.name).outputs, answ) : answ;
            currentPromise.resolve(decoded);
        }
        currentPromise = null;
    }
    const revertAction = answ => {
        if (!currentPromise) throw new Error('No queued promise found.');
        const error = new Error('Revert: ' + uint8ArrayToHex(answ));
        currentPromise.reject(error);
        currentPromise = null;
    }

    let minstance;

    const getAddress = () => address;
    const getMemory = () => minstance.exports.memory;
    const getGas = () => {
        if (!currentPromise) throw new Error('Get gas for inexistent transaction.');
        return currentPromise.gas;
    }
    const useGas = gas => {
        if (!currentPromise) throw new Error('Get gas for inexistent transaction.');
        currentPromise.gas.used += gas;
    }
    const getCaller = () => currentPromise.txInfo.from;
    const getOrigin = () => currentPromise.txInfo.origin;
    const getValue = () => currentPromise.txInfo.value;
    const getBlock = () => block;
    const getCalldata = () => currentPromise.calldata;
    const importObj = initializeEthImports(
        persistence,
        chainlogs,
        storageMap,
        wasmbin,
        getCalldata,
        getAddress,
        getCaller,
        getOrigin,
        getValue,
        getBlock,
        getMemory,
        getGas,
        useGas,
        finishAction,
        revertAction,
        transferValue,
    );
    const wmodule = await instantiateWasm(wasmbin, importObj);
    minstance = wmodule.instance;

    const getfname = (fabi) => !runtime ? 'constructor' : (fabi ? fabi.name : 'main');
    
    const wrappedMainRaw = (fabi) => (calldata, txInfo) => new Promise((resolve, reject) => {
        if (currentPromise) throw new Error('No queue implemented. Come back later.');
        const fname = getfname(fabi);

        currentPromise = {
            resolve,
            reject,
            name: fname,
            txInfo,
            gas: {limit: txInfo.gasLimit, price: txInfo.gasPrice, used: 0},
            calldata: typeof calldata === 'string' ? hexToUint8Array(calldata) : calldata,
        };
        minstance.exports.main();
    });

    const wrappedMain = (signature, fabi) => (...input) => {
        const fname = getfname(fabi);
        const args = input.slice(0, input.length - 1);
        const txInfo = input[input.length - 1];
        txInfo.origin = txInfo.origin || txInfo.from;
        txInfo.value = txInfo.value || 0;

        const calldataTypes = (wabi.find(abi => abi.name === fname) || {}).inputs;
        const calldata = signature ? encodeWithSignature(signature, calldataTypes, args) : encode(calldataTypes, args);
        
        return wrappedMainRaw(fabi) (calldata, txInfo);
    }

    const wrappedInstance = {
        instance: minstance,
        main: wrappedMain(),
        mainRaw: wrappedMainRaw(),
        address,
        abi: wabi,
        bin: wasmbin,
    }

    wabi.forEach(method => {
        if (method.name === 'constructor') return;
        if (method.type === 'fallback') {
            wrappedInstance[method.name] = wrappedMain();
        } else {
            const signature = ethers.utils.id(signatureFull(method)).substring(0, 10);
            wrappedInstance[method.name] = wrappedMain(signature, method);
        }
    })

    return wrappedInstance;
}

const signatureFull = fabi => {
    return `${fabi.name}(${fabi.inputs.map(inp => inp.type).join(',')})`;
}

const initializeEthImports = (
    persistence,
    chainlogs,
    storageMap,
    wasmbin,
    getCalldata,
    getAddress,
    getCaller,
    getOrigin,
    getValue,
    getBlock,
    getMemory,
    getGas,
    useGas,
    finishAction,
    revertAction,
    transferValue,
) => {
    const storeMemory = (bytes, offset, size) => {
        // console.log('storeMemory: ', logu8a(bytes.slice(0, 100)), offset, size);

        const wmemory = getMemory();
        let mem = new Uint8Array(wmemory.buffer);
        for (let i = 0; i < size; i++) {
            mem[offset + i] = bytes[i];
        }
    }
    const loadMemory = (offset, size) => {
        let res = getMemory().buffer.slice(offset, offset + size)
        return new Uint8Array(res);
    }
    const storageStore = (storageOffset_i32ptr, valueOffset_i32ptr) => {
        const wmemory = getMemory();
        let storage = new Uint8Array(storageMap.buffer);
        let mem = new Uint8Array(wmemory.buffer);

        for (let i = 0; i < 32; i++) {
            storage[storageOffset_i32ptr + i] = mem[valueOffset_i32ptr + i];
        }
    }
    const storageLoad = (storageOffset_i32ptr, resultOffset_i32ptr) => {
        let value = storageMap.buffer.slice(storageOffset_i32ptr, 32);
        storeMemory(new Uint8Array(value), resultOffset_i32ptr, 32);
    }

    return {
        // i32ptr is u128
        // 33 methods
        ethereum: {
            useGas: function (amount_i64) {
                // DONE_1
                useGas(amount_i64);
            },
            getAddress: function (resultOffset_i32ptr) {
                // DONE_1
                // const size = 20;
                const size = 32;
                const address = new Uint8Array(size);
                address.set(hexToUint8Array(getAddress()), size - 20);

                storeMemory(address, resultOffset_i32ptr, size);
            },
            // result is u128
            getExternalBalance: function (addressOffset_i32ptr, resultOffset_i32ptr) {
                // TOBEDONE FIXME

                let address = loadMemory(addressOffset_i32ptr, 32);
                address = uint8ArrayToHex(address).substring(0, 42);
                // const size = 16;
                const size = 32;
                const balance = new Uint8Array(size);
                const tightValue = hexToUint8Array(persistence.get(address).balance.toString(16));
                balance.set(tightValue, size - tightValue.length);
                storeMemory(balance, resultOffset_i32ptr, size);

                console.log('getExternalBalance', logu8a(loadMemory(resultOffset_i32ptr, size)));
            },
            // result i32 Returns 0 on success and 1 on failure
            getBlockHash: function (number_i64, resultOffset_i32ptr) {
                // DONE_1
                const hash = hexToUint8Array(getBlock().hash);
                storeMemory(hash, resultOffset_i32ptr, 32);
                return newi32(0);
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            call: function (
                gas_limit_i64,
                addressOffset_i32ptr_address, // the memory offset to load the address from (address)
                valueOffset_i32ptr_u128,
                dataOffset_i32ptr_bytes,
                dataLength_i32,
            ) {
                // TOBEDONE NEEDS BR_IF
                console.log('call', gas_limit_i64, addressOffset_i32ptr_address, valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32)
                return newi32(0);
            },
            callDataCopy: function (resultOffset_i32ptr_bytes, dataOffset_i32, length_i32) {
                // DONE_1
                storeMemory(
                    getCalldata()
                        .slice(dataOffset_i32, dataOffset_i32 + length_i32),
                    resultOffset_i32ptr_bytes,
                    length_i32,
                );
            },
            // returns i32
            getCallDataSize: function () {
                // DONE_1
                return newi32(getCalldata().length);
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            callCode: function (
                gas_limit_i64,
                addressOffset_i32ptr_address, // the memory offset to load the address from (address)
                valueOffset_i32ptr_u128,
                dataOffset_i32ptr_bytes,
                dataLength_i32,
            ) {
                // TOBEDONE NEEDS BR_IF
                console.log('callCode', gas_limit_i64, addressOffset_i32ptr_address, valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32)
                return newi32(0);
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            callDelegate: function (
                gas_limit_i64,
                addressOffset_i32ptr_address,
                dataOffset_i32ptr_bytes,
                dataLength_i32,
            ) {
                // TOBEDONE NEEDS BR_IF
                console.log('callDelegate', gas_limit_i64, addressOffset_i32ptr_address, dataOffset_i32ptr_bytes, dataLength_i32)
                return newi32(0);
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            callStatic: function (
                gas_limit_i64,
                addressOffset_i32ptr_address,
                dataOffset_i32ptr_bytes,
                dataLength_i32,
            ) {
                // TOBEDONE NEEDS BR_IF
                console.log('callStatic', gas_limit_i64, addressOffset_i32ptr_address, dataOffset_i32ptr_bytes, dataLength_i32)
                return newi32(0);
            },
            storageStore: function (pathOffset_i32ptr_bytes32, valueOffset_i32ptr_bytes32) {
                // DONE_1
                storageStore(pathOffset_i32ptr_bytes32, valueOffset_i32ptr_bytes32);
            },
            storageLoad: function (pathOffset_i32ptr_bytes32, resultOffset_i32ptr_bytes32) {
                // DONE_1
                storageLoad(pathOffset_i32ptr_bytes32, resultOffset_i32ptr_bytes32);
            },
            getCaller: function (resultOffset_i32ptr_address) {
                // DONE_1
                // const size = 20;
                const size = 32;
                const address = new Uint8Array(size);
                address.set(hexToUint8Array(getCaller()), size - 20);

                storeMemory(address, resultOffset_i32ptr_address, size);
            },
            getCallValue: function (resultOffset_i32ptr_u128) {
                // DONE_1
                // const size = 16;
                const size = 32;
                const value = new Uint8Array(size);
                const tightValue = hexToUint8Array(getValue().toString(16));
                value.set(tightValue, size - tightValue.length);
                storeMemory(value, resultOffset_i32ptr_u128, size);
            },
            codeCopy: function (resultOffset_i32ptr_bytes, codeOffset_i32, length_i32) {
                // DONE_1
                const runtime = wasmbin.slice(codeOffset_i32, codeOffset_i32 + length_i32)
                storeMemory(runtime, resultOffset_i32ptr_bytes, length_i32)
            },
            // returns i32 - code size current env
            getCodeSize: function() {
                // DONE_1
                return newi32(wasmbin.length);
            },
            // block’s beneficiary address
            getBlockCoinbase: function(resultOffset_i32ptr_address) {
                // DONE_1
                const size = 32;
                const value = new Uint8Array(size);
                const tightValue = hexToUint8Array(getBlock().coinbase);
                value.set(tightValue, size - tightValue.length);
                
                storeMemory(value, resultOffset_i32ptr_address, size);
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            create: function (
                valueOffset_i32ptr_u128,
                dataOffset_i32ptr_bytes,
                dataLength_i32,
                resultOffset_i32ptr_bytes,
            ) {
                // DONE_1
                const balance = parseInt(uint8ArrayToHex(
                    loadMemory(valueOffset_i32ptr_u128, 32)
                ), 16);
                const runtimeCode = loadMemory(dataOffset_i32ptr_bytes, dataLength_i32);
                const address = persistence.set({ runtimeCode, balance });

                const size = 32;
                const addrBytes = new Uint8Array(size);
                const tightValue = hexToUint8Array(address);
                addrBytes.set(tightValue, size - tightValue.length);
                storeMemory(addrBytes, resultOffset_i32ptr_bytes, size);

                return newi32(0);
            },
            // returns u256
            getBlockDifficulty: function (resulltOffset_i32ptr_u256) {
                // DONE_1
                const size = 32;
                const value = new Uint8Array(size);
                const tightValue = hexToUint8Array(getBlock().difficulty.toString(16));
                value.set(tightValue, size - tightValue.length);
                
                storeMemory(value, resulltOffset_i32ptr_u256, size);
            },
            externalCodeCopy: function (
                addressOffset_i32ptr_address, // the memory offset to load the address from (address)
                resultOffset_i32ptr_bytes,
                codeOffset_i32,
                dataLength_i32,
            ) {
                // DONE_1
                let address = loadMemory(addressOffset_i32ptr_address, 32);
                address = uint8ArrayToHex(address).substring(0, 42);
                const codeSlice = persistence.get(address).runtimeCode.slice(codeOffset_i32, codeOffset_i32 + dataLength_i32);
                storeMemory(codeSlice, resultOffset_i32ptr_bytes, dataLength_i32);
            },
            // Returns extCodeSize i32
            getExternalCodeSize: function (addressOffset_i32ptr_address) {
                // DONE_1
                let address = loadMemory(addressOffset_i32ptr_address, 32);
                address = uint8ArrayToHex(address).substring(0, 42);
                return newi32(persistence.get(address).runtimeCode.length);
            },
            // result gasLeft i64
            getGasLeft: function () {
                // DONE_1
                const gas = getGas();
                return newi64(gas.limit - gas.used);
            },
            // result blockGasLimit i64
            getBlockGasLimit: function () {
                // DONE_1
                return newi64(getBlock().gasLimit);
            },
            getTxGasPrice: function (resultOffset_i32ptr_u128) {
                // DONE_1
                const size = 32;
                const value = new Uint8Array(size);
                const tightValue = hexToUint8Array(getGas().price.toString(16));
                value.set(tightValue, size - tightValue.length);
                storeMemory(value, resultOffset_i32ptr_u128, size);
            },
            log: function (
                dataOffset_i32ptr_bytes,
                dataLength_i32,
                numberOfTopics_i32,
                ...topics
                // topic1_i32ptr_bytes32,
                // topic2_i32ptr_bytes32,
                // topic3_i32ptr_bytes32,
                // topic4_i32ptr_bytes32,
            ) {
                // DONE_1
                chainlogs.set({
                    blockNumber: getBlock().number,
                    data: loadMemory(dataOffset_i32ptr_bytes, dataLength_i32),
                    topics: topics.slice(0, numberOfTopics_i32),
                })
            },
            // result blockNumber i64
            getBlockNumber: function () {
                // DONE_1
                return newi64(getBlock().number);
            },
            getTxOrigin: function (resultOffset_i32ptr_address) {
                // DONE_1
                // const size = 20;
                const size = 32;
                const address = new Uint8Array(size);
                address.set(hexToUint8Array(getOrigin()), size - 20);

                storeMemory(address, resultOffset_i32ptr_address, size);
            },
            finish: function (dataOffset_i32ptr_bytes, dataLength_i32) {
                // DONE_1
                const res = loadMemory(dataOffset_i32ptr_bytes, dataLength_i32);
                finishAction(res);
            },
            revert: function (dataOffset_i32ptr_bytes, dataLength_i32) {
                // DONE_1
                const res = loadMemory(dataOffset_i32ptr_bytes, dataLength_i32);
                revertAction(res);
            },
            // result dataSize i32
            getReturnDataSize: function () {
                // TOBEDONE
                console.log('getReturnDataSize')
                return newi32(64);
            },
            returnDataCopy: function (resultOffset_i32ptr_bytes, dataOffset_i32, length_i32) {
                // TOBEDONE
                console.log('returnDataCopy', resultOffset_i32ptr_bytes, dataOffset_i32, length_i32)
            },
            selfDestruct: function (addressOffset_i32ptr_address) {
                // DONE_1
                let toAddress = loadMemory(addressOffset_i32ptr_address, 32);
                toAddress = uint8ArrayToHex(toAddress).substring(0, 42);

                const fromAddress = getAddress();
                transferValue(
                    fromAddress,
                    toAddress,
                    persistence.get(fromAddress).balance,
                );
                persistence.remove(fromAddress);
                finishAction();
            },
            // result blockTimestamp i64,
            getBlockTimestamp: function () {
                // DONE_1
                return newi64(getBlock().timestamp);
            }
        }
    }
}

const getBlock = tag => blocks.get(tag);
const getLogs = () => chainlogs;
// dev purposes:
const getPersistence = () => persistence;

module.exports = {deploy, runtime, runtimeSim, getBlock, getLogs, getPersistence};
