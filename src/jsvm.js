const {
    persistence: initPersistence,
    blocks: initBlocks,
    logs: initLogs,
} = require('./persistence.js');
const {
    uint8ArrayToHex,
    hexToUint8Array,
    newi32,
    newi64,
    extractAddress,
}  = require('./utils.js');

function jsvm() {

    const persistence = initPersistence();
    const blocks = initBlocks();
    const chainlogs = initLogs();

    const transferValue = (from, to, value) => {
        const fromBalance = persistence.get(from).balance;
        if (fromBalance < value) throw new Error('Not enough balance.');

        const toBalance = persistence.get(to).balance;
        persistence.updateBalance(to, toBalance + value);
        persistence.updateBalance(from, fromBalance - value);
    }

    const deploy = (txObj) => {
        const address = persistence.set({ runtimeCode: txObj.data, address: txObj.to });
        transferValue(
            txObj.from,
            address,
            txObj.value,
        );
        return address;
    }

    const call = (txObj, internalCallWrap, getMemory) => {
        const txInfo = Object.assign({}, txObj);
        txInfo.origin = txInfo.from;

        let gas = {
            limit: txObj.gasLimit || 1,
            price: txObj.gasPrice || 1,
            used: 0,
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
            const inst = persistence.get(txInfo.to);
            // constructor
            if (!inst.runtimeCode) return {
                runtimeCode: txInfo.data,
            }
            return inst;
        }

        return internalCall(
            txInfo,
            block,
            internalCallWrap,
            getGas,
            useGas,
            getInstance,
            getMemory || getNewMemory,
        );
    }

    const internalCall = (
        txObj,
        block,
        internalCallWrap,
        getGas,
        useGas,
        getInstance,
        getMemory,
    ) => {
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
            storageMap()[key] = value;
        }
        const storageLoad = (key) => {
            return storageMap()[key];
        }

        const vmapi = {
            // i32ptr is u128
            // 33 methods
            // ethereum: {
                storeMemory: function (bytes, offset) {
                    storeMemory(bytes, offset, 32);
                },
                storeMemory8: function (bytes, offset) {
                    storeMemory(bytes, offset, 1);
                },
                loadMemory: function (offset) {
                    return loadMemory(offset, 32);
                },
                useGas: function (amount_i64) {
                    // DONE_1
                    useGas(amount_i64);
                },
                getAddress: function () {
                    // DONE_1
                    // const size = 20;
                    const size = 32;
                    const address = new Uint8Array(size);
                    address.set(hexToUint8Array(getInstance().address), size - 20);
                    return address;
                },
                getSelfBalance: function () {
                    return vmapi.getExternalBalance(vmapi.getAddress());
                },
                // result is u128
                getExternalBalance: function (address) {
                    address = extractAddress(address);
                    const size = 32;
                    const balance = new Uint8Array(size);
                    const tightValue = hexToUint8Array(persistence.get(address).balance.toString(16));
                    balance.set(tightValue, size - tightValue.length);
                    return balance;
                },
                getBlockHash: function (number) {
                    return hexToUint8Array(block.hash);
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
                        txObj.data.slice(dataOffset_i32, dataOffset_i32 + length_i32),
                        resultOffset_i32ptr_bytes,
                        length_i32,
                    );
                },
                // returns i32
                getCallDataSize: function () {
                    // DONE_1
                    return newi32(txObj.data.length);
                },
                callDataLoad: function(dataOffset) {
                    return txObj.data.slice(dataOffset, dataOffset + 32);
                },
                // result i32 Returns 0 on success, 1 on failure and 2 on revert
                callCode: function (
                    gas_limit_i64,
                    addressOffset_i32ptr_address, // the memory offset to load the address from (address)
                    valueOffset_i32ptr_u128,
                    dataOffset_i32ptr_bytes,
                    dataLength_i32,
                ) {
                    // internalCallWrap
                    // TOBEDONE
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
                    address,
                    dataOffset_i32ptr_bytes,
                    dataLength_i32,
                ) {
                    // TOBEDONE NEEDS BR_IF
                    console.log('callStatic', gas_limit_i64, address, dataOffset_i32ptr_bytes, dataLength_i32)

                    let resp = internalCallWrap(gas_limit_i64, address);
                    console.log('resp', resp);
                    if(!resp) return newi32(0);

                    storeMemory(resp, dataOffset_i32ptr_bytes, dataLength_i32);
                    return newi32(1);
                },
                storageStore: function (key_uint8array, value_uint8array) {
                    // DONE_1
                    storageStore(key_uint8array, value_uint8array);
                },
                storageLoad: function (key_uint8array) {
                    // DONE_1
                    return storageLoad(key_uint8array);
                },
                getCaller: function () {
                    const size = 32;
                    const address = new Uint8Array(size);
                    address.set(hexToUint8Array(txObj.from), size - 20);
                    return address;
                },
                getCallValue: function () {
                    // DONE_1
                    // const size = 16;
                    const size = 32;
                    const value = new Uint8Array(size);
                    const tightValue = hexToUint8Array(txObj.value.toString(16));
                    value.set(tightValue, size - tightValue.length);
                    return value;
                },
                codeCopy: function (resultOffset_i32ptr_bytes, codeOffset_i32, length_i32) {
                    // DONE_1
                    const runtime = getInstance().runtimeCode.slice(codeOffset_i32, codeOffset_i32 + length_i32)
                    storeMemory(runtime, resultOffset_i32ptr_bytes, length_i32)
                },
                // returns i32 - code size current env
                getCodeSize: function() {
                    // DONE_1
                    return newi32(getInstance().runtimeCode.length);
                },
                // block’s beneficiary address
                getBlockCoinbase: function() {
                    // DONE_1
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
                    // DONE_1
                    const runtimeCode = loadMemory(dataOffset, dataLength);
                    const address = persistence.set({ runtimeCode, balance });

                    const size = 32;
                    const addrBytes = new Uint8Array(size);
                    const tightValue = hexToUint8Array(address);
                    addrBytes.set(tightValue, size - tightValue.length);
                    return addrBytes;
                },
                // returns u256
                getBlockDifficulty: function (resulltOffset_i32ptr_u256) {
                    // DONE_1
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
                    // DONE_1
                    address = extractAddress(address);
                    const codeSlice = persistence.get(address).runtimeCode.slice(codeOffset_i32, codeOffset_i32 + dataLength_i32);
                    storeMemory(codeSlice, resultOffset_i32ptr_bytes, dataLength_i32);
                },
                // Returns extCodeSize i32
                getExternalCodeSize: function (address) {
                    // DONE_1
                    address = extractAddress(address);
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
                    return newi64(block.gasLimit);
                },
                getTxGasPrice: function () {
                    // DONE_1
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
                    // DONE_1
                    chainlogs.set({
                        blockNumber: block.number,
                        data: loadMemory(dataOffset_i32ptr_bytes, dataLength_i32),
                        topics: topics.slice(0, numberOfTopics_i32),
                    })
                },
                // result blockNumber i64
                getBlockNumber: function () {
                    // DONE_1
                    return newi64(block.number);
                },
                getTxOrigin: function () {
                    // DONE_1
                    // const size = 20;
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
                    // TOBEDONE
                    console.log('getReturnDataSize')
                    return newi32(64);
                },
                returnDataCopy: function (resultOffset_i32ptr_bytes, dataOffset_i32, length_i32) {
                    // TOBEDONE
                    console.log('returnDataCopy', resultOffset_i32ptr_bytes, dataOffset_i32, length_i32)
                },
                selfDestruct: function (address) {
                    // DONE_1
                    const toAddress = extractAddress(address);
                    const fromAddress = getInstance().address;
                    transferValue(
                        fromAddress,
                        toAddress,
                        persistence.get(fromAddress).balance,
                    );
                    persistence.remove(fromAddress);
                },
                // result blockTimestamp i64,
                getBlockTimestamp: function () {
                    // DONE_1
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
                transferValue
            //}
        }
        return vmapi;
    }

    return {
        persistence,
        blocks,
        logs: chainlogs,
        call,
        deploy,
    }

}

module.exports = jsvm;

