// const sizeMap = {
//   address: 20,
//   uint: 32,
//   bytes32: 32,
// }
const sizeMap = {
    address: 20,
    uint16: 16,
    uint8: 8,
    uint32: 32,
    bytes32: 32,
}

const newi32 = value => new WebAssembly.Global({ value: 'i32', mutable: true }, value);
const newi64 = value => new WebAssembly.Global({ value: 'i64', mutable: true }, value);
// const newi64 = value => BigInt64Array.from([6]);
// const newi64 = value => new BigInt64Array(1);
// const newi64 = value => new BigInt(value);
// const newi64 = value => [newi32(5), newi32(6)];

function toByteArray(hexString) {
    var result = new ArrayBuffer(hexString.length / 2);
    for (var i = 0; i < hexString.length; i += 2) {
        // result.push(parseInt(hexString.substr(i, 2), 16));
        result[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return result;
}

function fromHex(hexString) {
    return new Uint8Array(hexString.match(/[0-9a-f]{2}/g).map(byte => parseInt(byte, 16)));
}

function uint8ArrayToHex(uint8arr) {
    let hexv = '';
    uint8arr.forEach(value => {
        hexv += value.toString(16).padStart(2, '0')
    });
    return hexv;
}

const decode = (uint8arr, funcabi) => {
    console.log('decode: ', uint8arr.toString());
    let offset = 0;
    let result = {};
    const values = funcabi.outputs.forEach(abi => {
        const size = sizeMap[abi.type];
        // const size = 32;
        // console.log('decode', uint8arr.slice(offset, offset + size));
        const value = uint8arr.slice(offset, offset + size).reverse().reduce((accum, val, i) => accum + val * Math.pow(256, i), 0);
        offset += size;
        result[abi.name] = value;
    });
    return result;
    // return uint8arr.reverse().reduce((accum, val, i) => accum + val * Math.pow(256, i), 0);
}
const encode = hex => {

}


const storageMap = new WebAssembly.Memory({ initial: 2 }); // Size is in pages.

const initialize =  (wasmHexSource, wabi)  => {
    return initializeWrap(fromHex(wasmHexSource), wabi);
}


const initializeWrap =  (wasmbin, wabi)  => {
    const wmodule = new WebAssembly.Module(wasmbin);

    let currentPromise;

    const finishAction = answ => {
        if (!currentPromise) throw new Error('No queued promise found.');
        if (currentPromise.name === 'constructor') {
            const newabi = wabi.filter(abi => abi.name !== 'constructor');
            const newmodule = initializeWrap(answ, newabi);
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

    const getMemory = () => minstance.exports.memory;
    const importObj = initializeEthImports(storageMap, wasmbin, getMemory, finishAction, revertAction);
    minstance = new WebAssembly.Instance(wmodule, importObj);
    
    const wrappedMain = input => new Promise((resolve, reject) => {
        const fname = wabi.find(abi => abi.name === 'constructor') ? 'constructor' : 'main';
        currentPromise = {resolve, reject, name: fname};
        minstance.exports.main(input);
    });

    return {
        instance: minstance,
        main: wrappedMain,
    }
}

const initializeEthImports = (storageMap, wasmbin, getMemory, finishAction, revertAction) => {
    const storeMemory = (bytes, offset, size) => {
        console.log('storeMemory', bytes.toString(), offset, size);
        const wmemory = getMemory();
        let mem = new Uint8Array(wmemory.buffer);
        for (let i = 0; i < size; i++) {
            mem[offset + i] = bytes[i];
        }
        // console.log('post storeMemory', wmemory.buffer.slice(0, offset + size));
        // console.log('all memory', wmemory.buffer);
    }
    const loadMemory = (offset, size) => {
        let res = getMemory().buffer.slice(offset, offset + size)
        return new Uint8Array(res);
    }
    const storageStore = (storageOffset_i32ptr, valueOffset_i32ptr) => {
        const wmemory = getMemory();
        let storage = new Uint8Array(storageMap);
        let mem = new Uint8Array(wmemory.buffer);

        for (let i = 0; i < 32; i++) {
            storage[storageOffset_i32ptr + i] = mem[valueOffset_i32ptr + i];
        }
    }
    const storageLoad = (storageOffset_i32ptr, resultOffset_i32ptr) => {
        const wmemory = getMemory();
        let storage = new Uint8Array(storageMap);
        let mem = new Uint8Array(wmemory.buffer);

        for (let i = 0; i < 32; i++) {
            mem[resultOffset_i32ptr + i] = storage[storageOffset_i32ptr + i];
        }
    }

    return {
        // i32ptr is u128
        ethereum: {
            useGas: function (amount_i64) {
                console.log('useGas', amount_i64)
            },
            getAddress: function (resultOffset_i32ptr) {
                // DONE
                console.log('getAddress', resultOffset_i32ptr)
                // storeAddress(m_msg.destination, resultOffset);
                // storeMemory(src.bytes, dstOffset, 20);
                // let address = 0x79F379CebBD362c99Af2765d1fa541415aa78508;
                const address = new Uint8Array(20);
                address[19] = 11;
                address[19] = 11;
                storeMemory(address, resultOffset_i32ptr, 20);

                console.log('getAddress', loadMemory(resultOffset_i32ptr, 20));
                // console.log(decode(loadMemory(resultOffset_i32ptr, 20)));
            },
            // result is u128
            getExternalBalance: function (addressOffset_i32ptr, resultOffset_i32ptr) {
                // DONE
                console.log('getExternalBalance', addressOffset_i32ptr, resultOffset_i32ptr)
                const balance = new Uint8Array(16);
                balance[14] = 22;
                balance[15] = 22;
                storeMemory(balance, resultOffset_i32ptr, 16);

                console.log('getExternalBalance', loadMemory(resultOffset_i32ptr, 16));
                // evmc_address address = loadAddress(addressOffset);
                // evmc_uint256be balance = m_host.get_balance(address);
                // storeUint128(balance, resultOffset);
            },
            // result i32 Returns 0 on success and 1 on failure
            getBlockHash: function (number_i64, resultOffset_i32ptr) {
                console.log('getBlockHash', number_i64, resultOffset_i32ptr)
                return newi32(1);
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            call: function (gas_limit_i64, addressOffset_i32ptr_address, // the memory offset to load the address from (address)
                valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32) {
                console.log('call', gas_limit_i64, addressOffset_i32ptr_address, valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32)
                return newi32(0);
            },
            callDataCopy: function (resultOffset_i32ptr_bytes, dataOffset_i32, length_i32) {
                console.log('callDataCopy', resultOffset_i32ptr_bytes, dataOffset_i32, length_i32)
            },
            // returns i32
            getCallDataSize: function () {
                console.log('getCallDataSize')
                return newi32(64);
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            callCode: function (gas_limit_i64, addressOffset_i32ptr_address, // the memory offset to load the address from (address)
                valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32) {
                console.log('callCode', gas_limit_i64, addressOffset_i32ptr_address, valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32)
                return newi32(0);
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            callDelegate: function (gas_limit_i64, addressOffset_i32ptr_address, dataOffset_i32ptr_bytes, dataLength_i32) {
                console.log('callDelegate', gas_limit_i64, addressOffset_i32ptr_address, dataOffset_i32ptr_bytes, dataLength_i32)
                return newi32(0);
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            callStatic: function (gas_limit_i64, addressOffset_i32ptr_address, dataOffset_i32ptr_bytes, dataLength_i32) {
                console.log('callStatic', gas_limit_i64, addressOffset_i32ptr_address, dataOffset_i32ptr_bytes, dataLength_i32)
                return newi32(0);
            },
            storageStore: function (pathOffset_i32ptr_bytes32, valueOffset_i32ptr_bytes32) {
                console.log('storageStore', pathOffset_i32ptr_bytes32, valueOffset_i32ptr_bytes32)
                storageStore(pathOffset_i32ptr_bytes32, valueOffset_i32ptr_bytes32);
            },
            storageLoad: function (pathOffset_i32ptr_bytes32, resultOffset_i32ptr_bytes32) {
                console.log('storageLoad', pathOffset_i32ptr_bytes32, resultOffset_i32ptr_bytes32)
                storageLoad(pathOffset_i32ptr_bytes32, resultOffset_i32ptr_bytes32);
            },
            getCaller: function (resultOffset_i32ptr_address) {
                // DONE
                console.log('getCaller', resultOffset_i32ptr_address)

                const address = new Uint8Array(20);
                address[19] = 33;
                storeMemory(address, resultOffset_i32ptr_address, 20);

                console.log('getCaller', loadMemory(resultOffset_i32ptr_address, 20));
            },
            getCallValue: function (resultOffset_i32ptr_u128) {
                // DONE
                console.log('getCallValue', resultOffset_i32ptr_u128)

                const value = new Uint8Array(16);
                value[15] = 44;
                storeMemory(value, resultOffset_i32ptr_u128, 16);

                console.log('getCallValue', loadMemory(resultOffset_i32ptr_u128, 16));
            },
            codeCopy: function (resultOffset_i32ptr_bytes, codeOffset_i32, length_i32) {
                console.log('codeCopy', resultOffset_i32ptr_bytes, codeOffset_i32, length_i32)

                // const code = loadMemory(codeOffset_i32, length_i32)
                // console.log('code', code)
                console.log('wasmbin.length', wasmbin.length)
                // console.log(wasmbin.slice(codeOffset_i32, codeOffset_i32 + 2))
                const runtime = wasmbin.slice(codeOffset_i32, codeOffset_i32 + length_i32)
                console.log('runtime', runtime.toString());
                storeMemory(runtime, resultOffset_i32ptr_bytes, length_i32)
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            create: function (valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32, resulltOffset_i32ptr_bytes) {
                console.log('create', valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32, resulltOffset_i32ptr_bytes)
                return newi32(1);
            },
            // returns u256
            getBlockDifficulty: function (resulltOffset_i32ptr_u256) {
                console.log('getBlockDifficulty', resulltOffset_i32ptr_u256)

                const value = new Uint8Array(32);
                value[31] = 77;
                storeMemory(value, resulltOffset_i32ptr_u256, 32);
            },
            externalCodeCopy: function (addressOffset_i32ptr_address, // the memory offset to load the address from (address)
                resultOffset_i32ptr_bytes, codeOffset_i32, dataLength_i32) {
                console.log('externalCodeCopy', addressOffset_i32ptr_address, resultOffset_i32ptr_bytes, codeOffset_i32, dataLength_i32)
            },
            // Returns extCodeSize i32
            getExternalCodeSize: function (addressOffset_i32ptr_address) {
                console.log('getExternalCodeSize', addressOffset_i32ptr_address)
                return newi32(90000);
            },
            // result gasLeft i64
            getGasLeft: function () {
                console.log('getGasLeft')
                return newi64(40);
            },
            // result blockGasLimit i64
            getBlockGasLimit: function () {
                console.log('getBlockGasLimit')
                return newi64(8000000);
            },
            getTxGasPrice: function (resultOffset_i32ptr_u128) {
                console.log('getTxGasPrice', resultOffset_i32ptr_u128)
            },
            log: function (dataOffset_i32ptr_bytes, dataLength_i32, numberOfTopics_i32, topic1_i32ptr_bytes32, topic2_i32ptr_bytes32, topic3_i32ptr_bytes32, topic4_i32ptr_bytes32) {
                console.log('log', dataOffset_i32ptr_bytes, dataLength_i32, numberOfTopics_i32, topic1_i32ptr_bytes32, topic2_i32ptr_bytes32, topic3_i32ptr_bytes32, topic4_i32ptr_bytes32)
            },
            // result blockNumber i64
            getBlockNumber: function () {
                console.log('getBlockNumber')
                return newi64(40000);
            },
            getTxOrigin: function (resultOffset_i32ptr_address) {
                console.log('getTxOrigin', resultOffset_i32ptr_address)
                const address = new Uint8Array(20);
                address[19] = 55;
                storeMemory(address, resultOffset_i32ptr_address, 20);
            },
            finish: function (dataOffset_i32ptr_bytes, dataLength_i32) {
                // DONE
                console.log('finish', dataOffset_i32ptr_bytes, dataLength_i32)

                const res = loadMemory(dataOffset_i32ptr_bytes, dataLength_i32);
                finishAction(res);
            },
            revert: function (dataOffset_i32ptr_bytes, dataLength_i32) {
                console.log('revert', dataOffset_i32ptr_bytes, dataLength_i32)

                const res = loadMemory(dataOffset_i32ptr_bytes, dataLength_i32);
                revertAction(res);
            },
            // result dataSize i32
            getReturnDataSize: function () {
                console.log('getReturnDataSize')
                return newi32(64);
            },
            returnDataCopy: function (resultOffset_i32ptr_bytes, dataOffset_i32, length_i32) {
                console.log('returnDataCopy', resultOffset_i32ptr_bytes, dataOffset_i32, length_i32)
            },
            selfDestruct: function (addressOffset_i32ptr_address) {
                console.log('selfDestruct', addressOffset_i32ptr_address)
            },
            // result blockTimestamp i64,
            getBlockTimestamp: function () {
                console.log('getBlockTimestamp')
                return newi64(1589188575755);
            }
        }
    }
}

module.exports = {initialize};