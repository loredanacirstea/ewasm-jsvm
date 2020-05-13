const { persistence: initPersistence, blocks: initBlocks } = require('./persistence.js');
const persistence = initPersistence();
const blocks = initBlocks();

const isNode = typeof process !== 'undefined'
    && process.versions != null
    && process.versions.node != null;

const sizeMap = {
    address: 20,
    uint16: 16,
    uint8: 8,
    uint32: 32,
    bytes32: 32,
}
const typeDecode = {
    address: uint8arr => '0x' + uint8ArrayToHex(uint8arr).substring(24),
    bytes32: uint8arr => '0x' + uint8ArrayToHex(uint8arr),
    default: uint8arr =>  uint8arr.reverse().reduce((accum, val, i) => accum + val * Math.pow(256, i), 0),
}

let newi32, newi64;
if (isNode) {
    newi32 = value => value;
    newi64 = value => BigInt(value);
} else {
    newi32 = value => new WebAssembly.Global({ value: 'i32', mutable: true }, value);
    newi64 = value => new WebAssembly.Global({ value: 'i64', mutable: true }, value);
}

function toByteArray(hexString) {
    var result = new ArrayBuffer(hexString.length / 2);
    for (var i = 0; i < hexString.length; i += 2) {
        result[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return result;
}

function hexToUint8Array(hexString) {
    hexString = hexString.slice(0, 2) === '0x' ? hexString.slice(2) : hexString;
    if (hexString.length % 2 === 1) hexString = '0' + hexString;
    return Uint8Array.from(Buffer.from(hexString, 'hex'));
}

function uint8ArrayToHex(uint8arr) {
    let hexv = '';
    uint8arr.forEach(value => {
        hexv += value.toString(16).padStart(2, '0')
    });
    return hexv;
}

const logu8a = uint8arr => `${uint8arr.join('')}, ${uint8arr.length}`;

const decode = (uint8arr, funcabi) => {
    console.log('decode: ', logu8a(uint8arr));
    let offset = 0;
    let result = {};
    const values = funcabi.outputs.forEach(abi => {
        // const size = sizeMap[abi.type];
        const size = 32;
        const value = (typeDecode[abi.type] || typeDecode.default)(uint8arr.slice(offset, offset + size));
        
        offset += size;
        result[abi.name] = value;
    });
    return result;
}
const encode = hex => {

}

const initialize =  (wasmHexSource, wabi)  => {
    return initializeWrap(hexToUint8Array(wasmHexSource), wabi);
}

const initializeWrap =  (wasmbin, wabi, runtime = false)  => {
    const storageMap = new WebAssembly.Memory({ initial: 2 }); // Size is in pages.
    const wmodule = new WebAssembly.Module(wasmbin);
    let address;
    if (runtime) address = persistence.set(wasmbin);
    const block = blocks.set();

    let currentPromise;

    const finishAction = answ => {
        if (!currentPromise) throw new Error('No queued promise found.');
        if (currentPromise.name === 'constructor') {
            const newabi = wabi.filter(abi => abi.name !== 'constructor');
            const newmodule = initializeWrap(answ, newabi, true);
            currentPromise.resolve(newmodule);
        } else {
            const decoded = decode(answ, wabi.find(abi => abi.name === currentPromise.name));
            currentPromise.resolve(decoded);
        }
        currentPromise = null;
    }
    const revertAction = answ => {
        if (!currentPromise) throw new Error('No queued promise found.');
        const decoded = decode(answ, wabi.find(abi => abi.name === currentPromise.name));
        currentPromise.reject(decoded);
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
    const importObj = initializeEthImports(
        storageMap,
        wasmbin,
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
    );
    minstance = new WebAssembly.Instance(wmodule, importObj);
    
    const wrappedMain = (...input) => new Promise((resolve, reject) => {
        if (currentPromise) throw new Error('No queue implemented. Come back later.');
        const fname = wabi.find(abi => abi.name === 'constructor') ? 'constructor' : 'main';
        const txInfo = input[input.length - 1];
        txInfo.origin = txInfo.origin || txInfo.from;
        txInfo.value = txInfo.value || 0;
        
        currentPromise = {resolve, reject, name: fname, txInfo, gas: {limit: txInfo.gasLimit, used: 0}};
        minstance.exports.main(...input.slice(0, input.length - 1));
    });

    return {
        instance: minstance,
        main: wrappedMain,
        address,
    }
}

const initializeEthImports = (
    storageMap,
    wasmbin,
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
) => {
    const storeMemory = (bytes, offset, size) => {
        console.log('storeMemory: ', logu8a(bytes.slice(0, 100)), offset, size);

        const wmemory = getMemory();
        let mem = new Uint8Array(wmemory.buffer);
        for (let i = 0; i < size; i++) {
            mem[offset + i] = bytes[i];
        }
        console.log('storeMemory2: ', logu8a(mem.slice(offset, offset+size)));
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
        // 31 methods
        ethereum: {
            useGas: function (amount_i64) {
                // DONE_1
                console.log('useGas', amount_i64)
                useGas(amount_i64);
            },
            getAddress: function (resultOffset_i32ptr) {
                // DONE_1
                console.log('getAddress', resultOffset_i32ptr)

                // const size = 20;
                const size = 32;
                const address = new Uint8Array(size);
                address.set(hexToUint8Array(getAddress()), size - 20);

                storeMemory(address, resultOffset_i32ptr, size);

                console.log('getAddress', logu8a(loadMemory(resultOffset_i32ptr, size)));
            },
            // result is u128
            getExternalBalance: function (addressOffset_i32ptr, resultOffset_i32ptr) {
                // TOBEDONE FIXME
                console.log('getExternalBalance', addressOffset_i32ptr, resultOffset_i32ptr)
                // const size = 16;
                const size = 32;
                const balance = new Uint8Array(size);
                balance[size-1] = 22;
                storeMemory(balance, resultOffset_i32ptr, size);

                console.log('getExternalBalance', logu8a(loadMemory(resultOffset_i32ptr, size)));
            },
            // result i32 Returns 0 on success and 1 on failure
            getBlockHash: function (number_i64, resultOffset_i32ptr) {
                // DONE_1
                console.log('getBlockHash', number_i64, resultOffset_i32ptr)
   
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
                // TOBEDONE NEEDS BR_IF
                console.log('callDataCopy', resultOffset_i32ptr_bytes, dataOffset_i32, length_i32)
            },
            // returns i32
            getCallDataSize: function () {
                // DONE_0
                console.log('getCallDataSize')
                return newi32(64);
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
                console.log('storageStore', pathOffset_i32ptr_bytes32, valueOffset_i32ptr_bytes32)
                storageStore(pathOffset_i32ptr_bytes32, valueOffset_i32ptr_bytes32);
            },
            storageLoad: function (pathOffset_i32ptr_bytes32, resultOffset_i32ptr_bytes32) {
                // DONE_1
                console.log('storageLoad', pathOffset_i32ptr_bytes32, resultOffset_i32ptr_bytes32)
                storageLoad(pathOffset_i32ptr_bytes32, resultOffset_i32ptr_bytes32);
            },
            getCaller: function (resultOffset_i32ptr_address) {
                // DONE_1
                console.log('getCaller', resultOffset_i32ptr_address)
                // const size = 20;
                const size = 32;
                const address = new Uint8Array(size);
                address.set(hexToUint8Array(getCaller()), size - 20);

                storeMemory(address, resultOffset_i32ptr_address, size);
                
                console.log('getCaller', logu8a(loadMemory(resultOffset_i32ptr_address, size)));
            },
            getCallValue: function (resultOffset_i32ptr_u128) {
                // DONE_1
                console.log('getCallValue', resultOffset_i32ptr_u128)
                // const size = 16;
                const size = 32;
                const value = new Uint8Array(size);
                const tightValue = hexToUint8Array(getValue().toString(16));
                value.set(tightValue, size - tightValue.length);
                storeMemory(value, resultOffset_i32ptr_u128, size);

                console.log('getCallValue', logu8a(loadMemory(resultOffset_i32ptr_u128, size)));
            },
            codeCopy: function (resultOffset_i32ptr_bytes, codeOffset_i32, length_i32) {
                // DONE_1
                console.log('codeCopy', resultOffset_i32ptr_bytes, codeOffset_i32, length_i32)

                const runtime = wasmbin.slice(codeOffset_i32, codeOffset_i32 + length_i32)
                storeMemory(runtime, resultOffset_i32ptr_bytes, length_i32)
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            create: function (
                valueOffset_i32ptr_u128,
                dataOffset_i32ptr_bytes,
                dataLength_i32,
                resulltOffset_i32ptr_bytes,
            ) {
                // TOBEDONE
                console.log('create', valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32, resulltOffset_i32ptr_bytes)
                return newi32(1);
            },
            // returns u256
            getBlockDifficulty: function (resulltOffset_i32ptr_u256) {
                // DONE_1
                console.log('getBlockDifficulty', resulltOffset_i32ptr_u256)
                const size = 32;
                const value = new Uint8Array(size);
                const tightValue = hexToUint8Array(getBlock().difficulty.toString(16));
                value.set(tightValue, size - tightValue.length);
                
                storeMemory(value, resulltOffset_i32ptr_u256, size);
            },
            externalCodeCopy: function (
                addressOffset_i32ptr_address, // the memory offset to load the address from (address)
                resultOffset_i32ptr_bytes,
                codeOffset_i32, dataLength_i32
            ) {
                // TOBEDONE
                console.log('externalCodeCopy', addressOffset_i32ptr_address, resultOffset_i32ptr_bytes, codeOffset_i32, dataLength_i32)
            },
            // Returns extCodeSize i32
            getExternalCodeSize: function (addressOffset_i32ptr_address) {
                // TOBEDONE
                console.log('getExternalCodeSize', addressOffset_i32ptr_address)
                return newi32(90000);
            },
            // result gasLeft i64
            getGasLeft: function () {
                // DONE_1
                console.log('getGasLeft')
                const gas = getGas();
                return newi64(gas.limit - gas.used);
            },
            // result blockGasLimit i64
            getBlockGasLimit: function () {
                // DONE_1
                console.log('getBlockGasLimit')
                return newi64(getBlock().gasLimit);
            },
            getTxGasPrice: function (resultOffset_i32ptr_u128) {
                // DONE_0
                console.log('getTxGasPrice', resultOffset_i32ptr_u128)
                const size = 32;
                const value = new Uint8Array(size);
                value[size - 1] = 88;
                storeMemory(value, resultOffset_i32ptr_u128, size);
            },
            log: function (
                dataOffset_i32ptr_bytes,
                dataLength_i32,
                numberOfTopics_i32,
                topic1_i32ptr_bytes32,
                topic2_i32ptr_bytes32,
                topic3_i32ptr_bytes32,
                topic4_i32ptr_bytes32,
            ) {
                // TOBEDONE
                console.log('log', dataOffset_i32ptr_bytes, dataLength_i32, numberOfTopics_i32, topic1_i32ptr_bytes32, topic2_i32ptr_bytes32, topic3_i32ptr_bytes32, topic4_i32ptr_bytes32);
            },
            // result blockNumber i64
            getBlockNumber: function () {
                // DONE_1
                console.log('getBlockNumber')
                return newi64(getBlock().number);
            },
            getTxOrigin: function (resultOffset_i32ptr_address) {
                // DONE_1
                console.log('getTxOrigin', resultOffset_i32ptr_address)
                // const size = 20;
                const size = 32;
                const address = new Uint8Array(size);
                address.set(hexToUint8Array(getOrigin()), size - 20);

                storeMemory(address, resultOffset_i32ptr_address, size);
            },
            finish: function (dataOffset_i32ptr_bytes, dataLength_i32) {
                // DONE_1
                console.log('finish', dataOffset_i32ptr_bytes, dataLength_i32)

                const res = loadMemory(dataOffset_i32ptr_bytes, dataLength_i32);
                finishAction(res);
            },
            revert: function (dataOffset_i32ptr_bytes, dataLength_i32) {
                // TOBEDONE
                console.log('revert', dataOffset_i32ptr_bytes, dataLength_i32)

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
                // TOBEDONE
                console.log('selfDestruct', addressOffset_i32ptr_address)
            },
            // result blockTimestamp i64,
            getBlockTimestamp: function () {
                // DONE_1
                console.log('getBlockTimestamp')
                return newi64(getBlock().timestamp);
            }
        }
    }
}

const getBlock = tag => blocks.get(tag);

module.exports = {initialize, getBlock};