const { ethers } = require('ethers');
const jsvm = require('./jsvm.js');
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
    extractAddress,
}  = require('./utils.js');

const jsvmi = jsvm();

const deploy = (wasmSource, wabi) => async (...args) => {
    const constructori = await initializeWrap(wasmSource, wabi, null, false);
    // TODO: constructor args
    const txInfo = args[args.length - 1];
    const address = await constructori.main(txInfo);
    const instance = await runtime(address, wabi);
    return instance;
}

const runtime = (address, wabi) => {
    const runtimeCode = jsvmi.persistence.get(address).runtimeCode;
    return initializeWrap(runtimeCode, wabi, address, true);
}

const runtimeSim = (wasmSource, wabi, address) => {
    address = address || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return initializeWrap(wasmSource, wabi, address, true);
}

const initializeWrap =  async (wasmbin, wabi, address, runtime = false) => {
    wasmbin = typeof wasmbin === 'string' ? hexToUint8Array(wasmbin) : wasmbin;
    // address = address || randomAddress();

    let currentPromise;

    const finishAction = answ => {
        if (!currentPromise) throw new Error('No queued promise found.');
        if (currentPromise.name === 'constructor') {
            address = jsvmi.deploy(Object.assign({}, currentPromise.txInfo, {data: answ, to: address}));
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

    const getfname = (fabi) => !runtime ? 'constructor' : (fabi ? fabi.name : 'main');

    const wrappedMainRaw = (fabi) => (txInfo) => new Promise((resolve, reject) => {
        if (currentPromise) throw new Error('No queue implemented. Come back later.');
        const fname = getfname(fabi);

        currentPromise = {
            resolve,
            reject,
            name: fname,
            txInfo,
            gas: {limit: txInfo.gasLimit, price: txInfo.gasPrice, used: 0},
            data: typeof txInfo.data === 'string' ? hexToUint8Array(txInfo.data) : txInfo.data,
        };
        currentPromise.txInfo.data = currentPromise.data;
        currentPromise.txInfo.to = address;

        let minstance;
        const getMemory = () => minstance.exports.memory
        const internalCallWrap = (...data) => {
            console.log('internalCallWrap', data);
            return 3;
        }

        const importObj = initializeEthImports(
            currentPromise.txInfo,
            internalCallWrap,
            getMemory,
            finishAction,
            revertAction,
        );
        instantiateWasm(wasmbin, importObj).then(wmodule => {
            minstance = wmodule.instance;
            minstance.exports.main();
        });
    });

    const wrappedMain = (signature, fabi) => (...input) => {
        const fname = getfname(fabi);
        const args = input.slice(0, input.length - 1);
        const txInfo = input[input.length - 1];
        txInfo.origin = txInfo.origin || txInfo.from;
        txInfo.value = txInfo.value || 0;

        const calldataTypes = (wabi.find(abi => abi.name === fname) || {}).inputs;
        const calldata = signature ? encodeWithSignature(signature, calldataTypes, args) : encode(calldataTypes, args);
        txInfo.data = calldata;

        if (!signature && !fabi && txInfo.data.length === 0) {
            // constructor
            txInfo.data = wasmbin;
        }

        return wrappedMainRaw(fabi) (txInfo);
    }

    const wrappedInstance = {
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
    txObj,
    internalCallWrap,
    getMemory,
    finishAction,
    revertAction,
) => {
    const jsvm_env = jsvmi.call(txObj, internalCallWrap, getMemory);
    return {
        // i32ptr is u128
        // 33 methods
        ethereum: {
            useGas: function (amount_i64) {
                // DONE_1
                jsvm_env.useGas(amount_i64);
            },
            getAddress: function (resultOffset_i32ptr) {
                // DONE_1
                const address = jsvm_env.getAddress();
                jsvm_env.storeMemory(address, resultOffset_i32ptr);
            },
            // result is u128
            getExternalBalance: function (addressOffset_i32ptr, resultOffset_i32ptr) {
                const address = readAddress(jsvm_env, addressOffset_i32ptr);
                const balance = jsvm_env.getExternalBalance(address);
                jsvm_env.storeMemory(balance, resultOffset_i32ptr);
            },
            // result i32 Returns 0 on success and 1 on failure
            getBlockHash: function (number_i64, resultOffset_i32ptr) {
                // DONE_1
                const hash = jsvm_env.getBlockHash(number_i64);
                jsvm_env.storeMemory(hash, resultOffset_i32ptr);
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
                const address = readAddress(jsvm_env, addressOffset_i32ptr_address);
                console.log('call', gas_limit_i64, addressOffset_i32ptr_address, valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32)
                return newi32(0);
            },
            callDataCopy: function (resultOffset_i32ptr_bytes, dataOffset_i32, length_i32) {
                // DONE_1
                jsvm_env.callDataCopy(resultOffset_i32ptr_bytes, dataOffset_i32, length_i32);
            },
            // returns i32
            getCallDataSize: function () {
                // DONE_1
                return jsvm_env.getCallDataSize();
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
                const address = readAddress(jsvm_env, addressOffset_i32ptr_address);
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
                const address = readAddress(jsvm_env, addressOffset_i32ptr_address);
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
                console.log('callStatic ewasm', gas_limit_i64, addressOffset_i32ptr_address, dataOffset_i32ptr_bytes, dataLength_i32)

                const address = readAddress(jsvm_env, addressOffset_i32ptr_address);
                console.log('callStatic address', address);

                return jsvm_env.getCallDataSize(gas_limit_i64, address, dataOffset_i32ptr_bytes, dataLength_i32);
            },
            storageStore: function (pathOffset_i32ptr_bytes32, valueOffset_i32ptr_bytes32) {
                // DONE_1
                const key = jsvm_env.loadMemory(pathOffset_i32ptr_bytes32);
                const value = jsvm_env.loadMemory(valueOffset_i32ptr_bytes32);
                jsvm_env.storageStore(key, value);
            },
            storageLoad: function (pathOffset_i32ptr_bytes32, resultOffset_i32ptr_bytes32) {
                // DONE_1
                const key = jsvm_env.loadMemory(pathOffset_i32ptr_bytes32);
                const value = jsvm_env.storageLoad(key);
                jsvm_env.storeMemory(value, resultOffset_i32ptr_bytes32);
            },
            getCaller: function (resultOffset_i32ptr_address) {
                // DONE_1
                const address = jsvm_env.getCaller();
                jsvm_env.storeMemory(address, resultOffset_i32ptr_address);
            },
            getCallValue: function (resultOffset_i32ptr_u128) {
                // DONE_1
                const value = jsvm_env.getCallValue();
                jsvm_env.storeMemory(value, resultOffset_i32ptr_u128);
            },
            codeCopy: function (resultOffset_i32ptr_bytes, codeOffset_i32, length_i32) {
                // DONE_1
                jsvm_env.codeCopy(resultOffset_i32ptr_bytes, codeOffset_i32, length_i32);
            },
            // returns i32 - code size current env
            getCodeSize: function() {
                // DONE_1
                return jsvm_env.getCodeSize();
            },
            // block’s beneficiary address
            getBlockCoinbase: function(resultOffset_i32ptr_address) {
                // DONE_1
                const value = jsvm_env.getBlockCoinbase();
                jsvm_env.storeMemory(value, resultOffset_i32ptr_address);
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
                    jsvm_env.loadMemory(valueOffset_i32ptr_u128, 32)
                ), 16);
                const address = jsvm_env.create(balance, dataOffset_i32ptr_bytes, dataLength_i32);
                jsvm_env.storeMemory(address, resultOffset_i32ptr_bytes);

                return newi32(0);
            },
            // returns u256
            getBlockDifficulty: function (resulltOffset_i32ptr_u256) {
                // DONE_1
                const value = jsvm_env.getBlockDifficulty();
                jsvm_env.storeMemory(value, resulltOffset_i32ptr_u256);
            },
            externalCodeCopy: function (
                addressOffset_i32ptr_address, // the memory offset to load the address from (address)
                resultOffset_i32ptr_bytes,
                codeOffset_i32,
                dataLength_i32,
            ) {
                // DONE_1
                const address = readAddress(jsvm_env, addressOffset_i32ptr_address);
                jsvm_env.externalCodeCopy(
                    address,
                    resultOffset_i32ptr_bytes,
                    codeOffset_i32,
                    dataLength_i32,
                )
            },
            // Returns extCodeSize i32
            getExternalCodeSize: function (addressOffset_i32ptr_address) {
                // DONE_1
                const address = readAddress(jsvm_env, addressOffset_i32ptr_address);
                return jsvm_env.getExternalCodeSize(address);
            },
            // result gasLeft i64
            getGasLeft: function () {
                // DONE_1
                return jsvm_env.getGasLeft();
            },
            // result blockGasLimit i64
            getBlockGasLimit: function () {
                // DONE_1
                return jsvm_env.getBlockGasLimit();
            },
            getTxGasPrice: function (resultOffset_i32ptr_u128) {
                // DONE_1
                const value = jsvm_env.getTxGasPrice();
                jsvm_env.storeMemory(value, resultOffset_i32ptr_u128);
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
                // atm they are not pointers, but values
                // const topics = topics_ptrs.map(ptr => {
                //     return jsvm_env.loadMemory(ptr);
                // });

                jsvm_env.log(
                    dataOffset_i32ptr_bytes,
                    dataLength_i32,
                    numberOfTopics_i32,
                    topics,
                );
            },
            // result blockNumber i64
            getBlockNumber: function () {
                // DONE_1
                return jsvm_env.getBlockNumber();
            },
            getTxOrigin: function (resultOffset_i32ptr_address) {
                // DONE_1
                const address = jsvm_env.getTxOrigin();
                jsvm_env.storeMemory(address, resultOffset_i32ptr_address);
            },
            finish: function (dataOffset_i32ptr_bytes, dataLength_i32) {
                // DONE_1
                const res = jsvm_env.finish(dataOffset_i32ptr_bytes, dataLength_i32);
                finishAction(res);
            },
            revert: function (dataOffset_i32ptr_bytes, dataLength_i32) {
                // DONE_1
                const res = jsvm_env.revert(dataOffset_i32ptr_bytes, dataLength_i32);
                revertAction(res);
            },
            // result dataSize i32
            getReturnDataSize: function () {
                // TOBEDONE
                return jsvm_env.getReturnDataSize();
            },
            returnDataCopy: function (resultOffset_i32ptr_bytes, dataOffset_i32, length_i32) {
                // TOBEDONE
                jsvm_env.returnDataCopy(resultOffset_i32ptr_bytes, dataOffset_i32, length_i32);
            },
            selfDestruct: function (addressOffset_i32ptr_address) {
                // DONE_1
                const address = readAddress(jsvm_env, addressOffset_i32ptr_address);
                jsvm_env.selfDestruct(address);
                finishAction();
            },
            // result blockTimestamp i64,
            getBlockTimestamp: function () {
                // DONE_1
                return jsvm_env.getBlockTimestamp();
            }
        }
    }
}

function readAddress (jsvm_env, addressOffset) {
    const address = jsvm_env.loadMemory(addressOffset);

    // rigth -> left shift
    let lsAddress = new Uint8Array(32);
    lsAddress.set(address.slice(0, 20), 12);
    return lsAddress;
}

const getBlock = tag => jsvmi.blocks.get(tag);
const getLogs = () => jsvmi.logs;
// dev purposes:
const getPersistence = () => jsvmi.persistence;

module.exports = {deploy, runtime, runtimeSim, getBlock, getLogs, getPersistence};
