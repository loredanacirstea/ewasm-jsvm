const BN = require('bn.js');
const {
    uint8ArrayToHex,
    newi32,
    instantiateWasm,
    toBN,
}  = require('./utils.js');
const {ERROR} = require('./constants');

const initializeImports = (
    vmcore,
    txObj,
    internalCallWrap,
    asyncResourceWrap,
    getMemory,
    getCache,
    finishAction,
    revertAction,
    logger,
) => {
    const jsvm_env = vmcore.call(txObj, internalCallWrap, asyncResourceWrap, getMemory, getCache);
    const ethereum = {
            useGas: function (amount_i64) {
                jsvm_env.useGas(toBN(amount_i64));
                logger.debug('useGas', [amount_i64], [], getCache(), getMemory());
            },
            getAddress: function (resultOffset_i32ptr) {
                const address = jsvm_env.getAddress();
                jsvm_env.storeMemory(address, toBN(resultOffset_i32ptr));
                logger.debug('getAddress', [resultOffset_i32ptr], [address], getCache(), getMemory());
            },
            // result is u128
            getExternalBalance: function (addressOffset_i32ptr, resultOffset_i32ptr) {
                const address = readAddress(jsvm_env, toBN(addressOffset_i32ptr));
                const balance = jsvm_env.getExternalBalance(address);
                jsvm_env.storeMemory(balance, toBN(resultOffset_i32ptr));
                logger.debug('getExternalBalance', [addressOffset_i32ptr, resultOffset_i32ptr], [balance], getCache(), getMemory());
            },
            // result i32 Returns 0 on success and 1 on failure
            getBlockHash: function (number_i64, resultOffset_i32ptr) {
                const hash = jsvm_env.getBlockHash(toBN(number_i64));
                jsvm_env.storeMemory(hash, toBN(resultOffset_i32ptr));
                const result = newi32(0);
                logger.debug('getBlockHash', [number_i64, resultOffset_i32ptr], [result, hash], getCache(), getMemory());
                return result;
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            call: function (
                gas_limit_i64,
                addressOffset_i32ptr_address, // the memory offset to load the address from (address)
                valueOffset_i32ptr_u128,
                dataOffset_i32ptr_bytes,
                dataLength_i32,
                // outputOffset_i32ptr_bytes,
                // outputLength_i32,
            ) {
                const address = readAddress(jsvm_env, toBN(addressOffset_i32ptr_address));
                const value = jsvm_env.loadMemory(toBN(valueOffset_i32ptr_u128), 32);

                const result = jsvm_env.call(
                    toBN(gas_limit_i64),
                    address,
                    value,
                    toBN(dataOffset_i32ptr_bytes),
                    toBN(dataLength_i32),
                    // outputOffset_i32ptr_bytes,
                    // outputLength_i32,
                );
                logger.debug('call', [gas_limit_i64, addressOffset_i32ptr_address, valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32], [result], getCache(), getMemory());
                return result;
            },
            callDataCopy: function (resultOffset_i32ptr_bytes, dataOffset_i32, length_i32) {
                const result = jsvm_env.callDataCopy(toBN(resultOffset_i32ptr_bytes), toBN(dataOffset_i32), toBN(length_i32));
                logger.debug('callDataCopy', [resultOffset_i32ptr_bytes, dataOffset_i32, length_i32], [result], getCache(), getMemory());
                return result;
            },
            // returns i32
            getCallDataSize: function () {
                const result = jsvm_env.getCallDataSize();
                logger.debug('getCallDataSize', [], [result], getCache(), getMemory());
                return result;
            },
            callDataLoad: function(dataOffset) {
                const result = jsvm_env.callDataLoad(toBN(dataOffset));
                logger.debug('callDataLoad', [dataOffset], [result], getCache(), getMemory());
                return result;
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            callCode: function (
                gas_limit_i64,
                addressOffset_i32ptr_address, // the memory offset to load the address from (address)
                valueOffset_i32ptr_u128,
                dataOffset_i32ptr_bytes,
                dataLength_i32,
            ) {
                const address = readAddress(jsvm_env, toBN(addressOffset_i32ptr_address));
                const value = jsvm_env.loadMemory(toBN(valueOffset_i32ptr_u128), 32);
                const result = jsvm_env.callCode(
                    gas_limit_i64,
                    address,
                    value,
                    toBN(dataOffset_i32ptr_bytes),
                    toBN(dataLength_i32),
                    // outputOffset_i32ptr_bytes,
                    // outputLength_i32,
                );
                logger.debug('callCode', [gas_limit_i64, addressOffset_i32ptr_address, valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32], [result], getCache(), getMemory());
                return result;
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            callDelegate: function (
                gas_limit_i64,
                addressOffset_i32ptr_address,
                dataOffset_i32ptr_bytes,
                dataLength_i32,
            ) {
                const address = readAddress(jsvm_env, toBN(addressOffset_i32ptr_address));
                const result = jsvm_env.callDelegate(
                    toBN(gas_limit_i64),
                    address,
                    toBN(dataOffset_i32ptr_bytes),
                    toBN(dataLength_i32),
                    // outputOffset_i32ptr_bytes,
                    // outputLength_i32,
                );
                logger.debug('callDelegate', [gas_limit_i64, addressOffset_i32ptr_address, dataOffset_i32ptr_bytes, dataLength_i32], [result], getCache(), getMemory());
                return result;
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            callStatic: function (
                gas_limit_i64,
                addressOffset_i32ptr_address,
                dataOffset_i32ptr_bytes,
                dataLength_i32,
                // outputOffset_i32ptr_bytes,
                // outputLength_i32,
            ) {
                const address = readAddress(jsvm_env, toBN(addressOffset_i32ptr_address));

                const result = jsvm_env.callStatic(
                    toBN(gas_limit_i64),
                    address,
                    toBN(dataOffset_i32ptr_bytes),
                    toBN(dataLength_i32),
                    // outputOffset_i32ptr_bytes,
                    // outputLength_i32,
                );

                logger.debug('callStatic', [gas_limit_i64, addressOffset_i32ptr_address, dataOffset_i32ptr_bytes, dataLength_i32], [result], getCache(), getMemory());
                return result;
            },
            storageStore: function (pathOffset_i32ptr_bytes32, valueOffset_i32ptr_bytes32) {
                const key = jsvm_env.loadMemory(toBN(pathOffset_i32ptr_bytes32));
                const value = jsvm_env.loadMemory(toBN(valueOffset_i32ptr_bytes32));
                jsvm_env.storageStore(key, value);

                logger.debug('storageStore', [pathOffset_i32ptr_bytes32, valueOffset_i32ptr_bytes32], [key, value], getCache(), getMemory());
            },
            storageLoad: function (pathOffset_i32ptr_bytes32, resultOffset_i32ptr_bytes32) {
                const key = jsvm_env.loadMemory(toBN(pathOffset_i32ptr_bytes32));
                const value = jsvm_env.storageLoad(key);
                jsvm_env.storeMemory(value, toBN(resultOffset_i32ptr_bytes32));

                logger.debug('storageLoad', [pathOffset_i32ptr_bytes32, resultOffset_i32ptr_bytes32], [value], getCache(), getMemory());
            },
            getCaller: function (resultOffset_i32ptr_address) {
                const address = jsvm_env.getCaller();
                jsvm_env.storeMemory(address, toBN(resultOffset_i32ptr_address));
                logger.debug('getCaller', [resultOffset_i32ptr_address], [address], getCache(), getMemory());
            },
            getCallValue: function (resultOffset_i32ptr_u128) {
                const value = jsvm_env.getCallValue();
                jsvm_env.storeMemory(value, toBN(resultOffset_i32ptr_u128));
                logger.debug('getCallValue', [resultOffset_i32ptr_u128], [value], getCache(), getMemory());
            },
            codeCopy: function (resultOffset_i32ptr_bytes, codeOffset_i32, length_i32) {
                const result = jsvm_env.codeCopy(toBN(resultOffset_i32ptr_bytes), toBN(codeOffset_i32), toBN(length_i32));
                logger.debug('codeCopy', [resultOffset_i32ptr_bytes, codeOffset_i32, length_i32], [result], getCache(), getMemory());
            },
            // returns i32 - code size current env
            getCodeSize: function() {
                const result = jsvm_env.getCodeSize();
                logger.debug('getCodeSize', [], [result], getCache(), getMemory());
                return result;
            },
            // block’s beneficiary address
            getBlockCoinbase: function(resultOffset_i32ptr_address) {
                const value = jsvm_env.getBlockCoinbase();
                jsvm_env.storeMemory(value, toBN(resultOffset_i32ptr_address));
                logger.debug('getBlockCoinbase', [resultOffset_i32ptr_address], [value], getCache(), getMemory());
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            create: function (
                valueOffset_i32ptr_u128,
                dataOffset_i32ptr_bytes,
                dataLength_i32,
                resultOffset_i32ptr_bytes,
            ) {
                const balance = jsvm_env.loadMemory(toBN(valueOffset_i32ptr_u128), 32);
                const address = jsvm_env.create(balance, toBN(dataOffset_i32ptr_bytes), toBN(dataLength_i32));
                jsvm_env.storeMemory(address, toBN(resultOffset_i32ptr_bytes));

                logger.debug('create', [valueOffset_i32ptr_u128,
                    dataOffset_i32ptr_bytes,
                    dataLength_i32,
                    resultOffset_i32ptr_bytes
                ], [address], getCache(), getMemory());

                return newi32(0);
            },
            // returns u256
            getBlockDifficulty: function (resulltOffset_i32ptr_u256) {
                const value = jsvm_env.getBlockDifficulty();
                jsvm_env.storeMemory(value, toBN(resulltOffset_i32ptr_u256));

                logger.debug('getBlockDifficulty', [resulltOffset_i32ptr_u256], [value], getCache(), getMemory());
            },
            externalCodeCopy: function (
                addressOffset_i32ptr_address, // the memory offset to load the address from (address)
                resultOffset_i32ptr_bytes,
                codeOffset_i32,
                dataLength_i32,
            ) {
                const address = readAddress(jsvm_env, toBN(addressOffset_i32ptr_address));
                jsvm_env.externalCodeCopy(
                    address,
                    toBN(resultOffset_i32ptr_bytes),
                    toBN(codeOffset_i32),
                    toBN(dataLength_i32),
                )
                logger.debug('externalCodeCopy', [addressOffset_i32ptr_address,
                    resultOffset_i32ptr_bytes,
                    codeOffset_i32,
                    dataLength_i32
                ], [], getCache(), getMemory());
            },
            // Returns extCodeSize i32
            getExternalCodeSize: function (addressOffset_i32ptr_address) {
                const address = readAddress(jsvm_env, toBN(addressOffset_i32ptr_address));
                const result = jsvm_env.getExternalCodeSize(address);
                logger.debug('getExternalCodeSize', [addressOffset_i32ptr_address], [result], getCache(), getMemory());
                return result;
            },
            // result gasLeft i64
            getGasLeft: function () {
                const result = jsvm_env.getGasLeft();
                logger.debug('getGasLeft', [], [result], getCache(), getMemory());
                return result;
            },
            // result blockGasLimit i64
            getBlockGasLimit: function () {
                const result = jsvm_env.getBlockGasLimit();
                logger.debug('getBlockGasLimit', [], [result], getCache(), getMemory());
                return result;
            },
            getTxGasPrice: function (resultOffset_i32ptr_u128) {
                const value = jsvm_env.getTxGasPrice();
                jsvm_env.storeMemory(value, toBN(resultOffset_i32ptr_u128));

                logger.debug('getTxGasPrice', [resultOffset_i32ptr_u128], [value], getCache(), getMemory());
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
                    toBN(dataOffset_i32ptr_bytes),
                    toBN(dataLength_i32),
                    toBN(numberOfTopics_i32),
                    topics.map(topic => toBN(topic)),
                );
                logger.debug('log', [dataOffset_i32ptr_bytes,
                    dataLength_i32,
                    numberOfTopics_i32,
                    ...topics
                ], [], getCache(), getMemory());
            },
            // result blockNumber i64
            getBlockNumber: function () {
                const result = jsvm_env.getBlockNumber();
                logger.debug('getBlockNumber', [], [result], getCache(), getMemory());
                return result;
            },
            getTxOrigin: function (resultOffset_i32ptr_address) {
                const address = jsvm_env.getTxOrigin();
                jsvm_env.storeMemory(address, toBN(resultOffset_i32ptr_address));
                logger.debug('getTxOrigin', [resultOffset_i32ptr_address], [address], getCache(), getMemory());
            },
            finish: function (dataOffset_i32ptr_bytes, dataLength_i32) {
                const res = jsvm_env.finish(toBN(dataOffset_i32ptr_bytes), toBN(dataLength_i32));
                logger.debug('finish', [dataOffset_i32ptr_bytes, dataLength_i32], [res], getCache(), getMemory());
                finishAction(res);
                throw new Error(ERROR.STOP);
            },
            revert: function (dataOffset_i32ptr_bytes, dataLength_i32) {
                const res = jsvm_env.revert(toBN(dataOffset_i32ptr_bytes), toBN(dataLength_i32));
                console.log('revert');
                logger.debug('revert', [dataOffset_i32ptr_bytes, dataLength_i32], [res], getCache(), getMemory());
                revertAction(res);
                throw new Error(ERROR.STOP);
            },
            // result dataSize i32
            getReturnDataSize: function () {
                const result = jsvm_env.getReturnDataSize();
                logger.debug('getReturnDataSize', [], [result], getCache(), getMemory());
                return result;
            },
            returnDataCopy: function (resultOffset_i32ptr_bytes, dataOffset_i32, length_i32) {
                jsvm_env.returnDataCopy(toBN(resultOffset_i32ptr_bytes), toBN(dataOffset_i32), toBN(length_i32));
                logger.debug('returnDataCopy', [resultOffset_i32ptr_bytes, dataOffset_i32, length_i32], [], getCache(), getMemory());
            },
            selfDestruct: function (addressOffset_i32ptr_address) {
                const address = readAddress(jsvm_env, toBN(addressOffset_i32ptr_address));
                jsvm_env.selfDestruct(address);
                logger.debug('selfDestruct', [addressOffset_i32ptr_address], [], getCache(), getMemory());
                finishAction();
                throw new Error(ERROR.STOP);
            },
            // result blockTimestamp i64,
            getBlockTimestamp: function () {
                const result = jsvm_env.getBlockTimestamp();
                logger.debug('getBlockTimestamp', [], [result], getCache(), getMemory());
                return result;
            }
    }

    return {ethereum};
}

const instantiateModule = instantiateWasm;

function readAddress(jsvm_env, addressOffset) {
    const address = jsvm_env.loadMemory(addressOffset);
    // rigth -> left shift
    let lsAddress = new Uint8Array(32);
    lsAddress.set(address.slice(0, 20), 12);
    return lsAddress;
}


module.exports = {initializeImports, instantiateModule};
