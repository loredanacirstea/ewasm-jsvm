const { ethers } = require('ethers');
const { ERROR } = require('./constants');
const Logger = require('./config');
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
const {
    cloneContext,
    cloneLogs,
} = require('./persistence.js');

const jsvmi = jsvm();

const deploy = (wasmSource, wabi) => async (...args) => {
    Logger.get('ewasmvm').debug('deploy', ...args);
    const address = randomAddress();
    const constructori = await initializeWrap(wasmSource, wabi, address, false);
    // TODO: constructor args
    const txInfo = args[args.length - 1];
    await constructori.main(txInfo);
    Logger.get('ewasmvm').debug('deployed', address);
    const instance = await runtime(address, wabi);
    return instance;
}

const runtime = (address, wabi) => {
    Logger.get('ewasmvm').debug('runtime', address);
    const runtimeCode = jsvmi.persistence.get(address).runtimeCode;
    return initializeWrap(runtimeCode, wabi, address, true);
}

const runtimeSim = (wasmSource, wabi, address) => {
    address = address || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    return initializeWrap(wasmSource, wabi, address, true);
}

async function initializeWrap (wasmbin, wabi=[], address, atRuntime = false) {
    wasmbin = typeof wasmbin === 'string' ? hexToUint8Array(wasmbin) : wasmbin;
    let currentPromise;

    Logger.get('ewasmvm').get('initializeWrap').debug(address);

    opcodelogs = [];
    opcodeLogger = Logger.spawn('opcodes', Logger.LEVELS.DEBUG, (...args) => {
        const [name, input, output, cache, memory] = args;
        const {context, logs, data} = cache;
        const clonedContext = cloneContext(context);
        const clonedLogs =  cloneLogs(logs);
        const currentContext = clonedContext[address] || {};
        clonedMemory = hexToUint8Array(uint8ArrayToHex(new Uint8Array(memory.buffer)));
        opcodelogs.push({name, input, output, memory: clonedMemory, logs: clonedLogs, context: clonedContext, contract: currentContext});
        return;
    });

    function storeStateChanges (context, logs) {
        Logger.get('ewasmvm').get('storeStateChanges').debug(Object.keys(context), logs.length);
        Logger.get('ewasmvm').get('context').debug('storeStateChanges', context);
        Logger.get('ewasmvm').get('logs').debug('storeStateChanges', logs);
        jsvmi.persistence.setBulk(context);
        jsvmi.logs.setBulk(logs);
    }

    const finishAction = answ => {
        // TODO: code doesn't have a currentPromise when wasm execution is restarted
        // same for revert; the promise should not vanish.
        if (!currentPromise) return; //  throw new Error('No queued promise found.');
        if (currentPromise.name === 'constructor') {
            Logger.get('ewasmvm').get('finishAction_constructor').debug(currentPromise.name, answ);
            currentPromise.cache.context[address].runtimeCode = answ;
            storeStateChanges(currentPromise.cache.context, currentPromise.cache.logs);
            currentPromise.resolve(address);
        } else {
            const abi = wabi.find(abi => abi.name === currentPromise.name);
            Logger.get('ewasmvm').get('finishAction').debug(currentPromise.name, answ);
            const decoded = answ && abi && abi.outputs ? decode(abi.outputs, answ) : answ;
            storeStateChanges(currentPromise.cache.context, currentPromise.cache.logs);
            currentPromise.resolve(decoded);
        }
        currentPromise = null;
    }
    const revertAction = answ => {
        if (!currentPromise) return; //  throw new Error('No queued promise found.');
        const error = new Error('Revert: ' + uint8ArrayToHex(answ));
        Logger.get('ewasmvm').get('revertAction').debug(currentPromise.name, answ);
        currentPromise.reject(error);
        currentPromise = null;
    }

    const getfname = (fabi) => !atRuntime ? 'constructor' : (fabi ? fabi.name : 'main');

    const wrappedMainRaw = (fabi) => (txInfo, existingCache = {}) => new Promise((resolve, reject) => {
        if (currentPromise) throw new Error('No queue implemented. Come back later.');
        const fname = getfname(fabi);
        let minstance;
        txInfo = {...txInfo};  // TODO immutable
        txInfo.to = txInfo.to || address;

        Logger.get('ewasmvm').get('tx').debug('wrappedMainRaw--' + fname, txInfo);

        // cache is changed in place, by reference
        // context[address] = {balance, runtimeCode, storage}  // persistence
        // data[index] = {gaslimit, to, data, value, result}
        const cache = { data: {}, context: existingCache.context || {}, logs: existingCache.logs || [] };
        cache.get = index => cache.data[index];
        cache.set = (index, obj) => cache.data[index] = obj;
        cache.getAndCheck = (index, txobj) => {
            const cachedtx = cache.get(index);
            const hexdata = lowtx2hex(txobj)

            if (!cachedtx || !cachedtx.result) return;
            Object.keys(cachedtx).forEach(key => {
                if (key !== 'result' && comparify(cachedtx[key]) !== comparify(hexdata[key])) throw new Error(`Cache doesn't match data for key ${key}. Cache: ${cachedtx[key]} vs. ${hexdata[key]}`);
            });
            return cachedtx;
        }
        cache.context[txInfo.from] = jsvmi.persistence.get(txInfo.from);
        cache.context[txInfo.to] = jsvmi.persistence.get(txInfo.to);
        // constructor
        if (!cache.context[txInfo.to].runtimeCode) {
            cache.context[txInfo.to].runtimeCode = txInfo.data;
            cache.context[txInfo.to].storage = {};
        }
        // needed, otherwise it cycles;
        cache.context[txInfo.from].empty = false;
        cache.context[txInfo.to].empty = false;

        const getMemory = () => minstance.exports.memory
        const getCache = () => {
            // TODO somehow this gets called after finishAction
            // need to see where
            return currentPromise.cache;
        }

        let internalCallTxObj = {};
        const internalCallWrap = (index, dataObj, context, logs) => {
            const newtx = {
                ...currentPromise.txInfo,
                ...lowtx2hex(dataObj),
            }

            currentPromise.parent = true;
            internalCallTxObj = { index, newtx, context, logs };
        }

        const internalCallWrapContinue = async () => {
            const { index, newtx, context, logs } = internalCallTxObj;
            Logger.get('ewasmvm').get('internalCallWrapContinue').debug(index);

            const wmodule = await runtime(newtx.to, []);
            let result = {};
            currentPromise.cache.data[index] = newtx;
            try {
                result.data = await wmodule.mainRaw(newtx, {context, logs});  // TODO pass apropriate cache
                result.success = 1;
            } catch (e) {
                result.success = 0;
            }
            currentPromise.cache.data[index].result = result;
            internalCallTxObj = {};

            // restart execution from scratch with updated cache
            // TODO: get gas left and forward it
            startExecution(wasmbin, currentPromise.txInfo, currentPromise.cache);
        }

        let internalResourceCall = {};
        const asyncResourceWrap = (account) => {
            internalResourceCall.account = account;
        }
        const asyncResourceWrapContinue = async() => {
            const data = jsvmi.persistence.get(internalResourceCall.account);
            // We must delete this, to avoid requesting the resource over and over again
            delete data.empty;
            currentPromise.cache.context[internalResourceCall.account] = data;
            Logger.get('ewasmvm').get('asyncResourceWrapContinue').debug(data.account, data.balance, Object.keys(currentPromise.cache.context));
            internalResourceCall = {};

            // restart execution from scratch with updated cache
            startExecution(wasmbin, currentPromise.txInfo, currentPromise.cache);
        }

        const startExecution = (_wasmbin, txInfo, cache) => {
            currentPromise = {
                resolve,
                reject,
                name: fname,
                txInfo,
                gas: {limit: txInfo.gasLimit, price: txInfo.gasPrice, used: newi64(0)},
                data: typeof txInfo.data === 'string' ? hexToUint8Array(txInfo.data) : txInfo.data,
                cache,
            };
            currentPromise.txInfo.data = currentPromise.data;
            currentPromise.txInfo.to = address;

            if (!currentPromise.cache.context[txInfo.to]) {
                currentPromise.cache.context[txInfo.to] = jsvmi.persistence.get(txInfo.to);
                currentPromise.cache.context[txInfo.to].empty = false;
            }

            Logger.get('ewasmvm').get('tx').debug('startExecution', currentPromise.txInfo);
            Logger.get('ewasmvm').debug('startExecution', Object.keys(currentPromise.cache.context));

            const importObj = initializeEthImports(
                currentPromise.txInfo,
                internalCallWrap,
                asyncResourceWrap,
                getMemory,
                getCache,
                finishAction,
                revertAction,
                opcodeLogger,
            );

            instantiateWasm(_wasmbin, importObj).then(wmodule => {
                minstance = wmodule.instance;
                opcodeLogger.debug('--', [], [], getCache(), getMemory());
                try {
                    minstance.exports.main();
                } catch (e) {
                    console.log(e.message);

                    switch(e.message) {
                        case ERROR.ASYNC_CALL:
                            // wasm execution stopped, so it can be restarted
                            // TODO - restart needs to wait until call result
                            internalCallWrapContinue();
                            break;
                        case ERROR.ASYNC_RESOURCE:
                            asyncResourceWrapContinue();
                            break;
                        default:
                            throw e;
                    }
                }
            });
        }

        startExecution(wasmbin, txInfo, cache);
    });

    const wrappedMain = (signature, fabi) => (...input) => {
        const fname = getfname(fabi);
        const args = input.slice(0, input.length - 1);
        const txInfo = input[input.length - 1];
        txInfo.origin = txInfo.origin || txInfo.from;
        txInfo.value = txInfo.value || '0x00';


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
        logs: opcodelogs,
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

function lowtx2hex(dataObj) {
    return {
        ...dataObj,
        to: extractAddress(dataObj.to),
        value: uint8ArrayToHex(dataObj.value),
        from: extractAddress(dataObj.from),
        origin: extractAddress(dataObj.origin),
        // gasLimit, gasPrice? transform to hex
    }
}

const initializeEthImports = (
    txObj,
    internalCallWrap,
    asyncResourceWrap,
    getMemory,
    getCache,
    finishAction,
    revertAction,
    logger,
) => {
    const jsvm_env = jsvmi.call(txObj, internalCallWrap, asyncResourceWrap, getMemory, getCache);
    return {
        // i32ptr is u128
        // 33 methods
        ethereum: {
            useGas: function (amount_i64) {
                jsvm_env.useGas(amount_i64);
                logger.debug('useGas', [amount_i64], [], getCache(), getMemory());
            },
            getAddress: function (resultOffset_i32ptr) {
                const address = jsvm_env.getAddress();
                jsvm_env.storeMemory(address, resultOffset_i32ptr);
                logger.debug('getAddress', [resultOffset_i32ptr], [address], getCache(), getMemory());
            },
            // result is u128
            getExternalBalance: function (addressOffset_i32ptr, resultOffset_i32ptr) {
                const address = readAddress(jsvm_env, addressOffset_i32ptr);
                const balance = jsvm_env.getExternalBalance(address);
                jsvm_env.storeMemory(balance, resultOffset_i32ptr);
                logger.debug('getExternalBalance', [addressOffset_i32ptr, resultOffset_i32ptr], [balance], getCache(), getMemory());
            },
            // result i32 Returns 0 on success and 1 on failure
            getBlockHash: function (number_i64, resultOffset_i32ptr) {
                const hash = jsvm_env.getBlockHash(number_i64);
                jsvm_env.storeMemory(hash, resultOffset_i32ptr);
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
                const address = readAddress(jsvm_env, addressOffset_i32ptr_address);

                // return newi32(0);

                const result = jsvm_env.call(
                    gas_limit_i64,
                    address,
                    valueOffset_i32ptr_u128,
                    dataOffset_i32ptr_bytes,
                    dataLength_i32,
                    // outputOffset_i32ptr_bytes,
                    // outputLength_i32,
                );
                logger.debug('call', [gas_limit_i64, addressOffset_i32ptr_address, valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32], [result], getCache(), getMemory());
                return result;
            },
            callDataCopy: function (resultOffset_i32ptr_bytes, dataOffset_i32, length_i32) {
                const result = jsvm_env.callDataCopy(resultOffset_i32ptr_bytes, dataOffset_i32, length_i32);
                logger.debug('callDataCopy', [resultOffset_i32ptr_bytes, dataOffset_i32, length_i32], [result], getCache(), getMemory());
                return result;
            },
            // returns i32
            getCallDataSize: function () {
                const result = jsvm_env.getCallDataSize();
                logger.debug('getCallDataSize', [], [result], getCache(), getMemory());
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
                const address = readAddress(jsvm_env, addressOffset_i32ptr_address);
                const result = jsvm_env.callCode(
                    gas_limit_i64,
                    address,
                    valueOffset_i32ptr_u128,
                    dataOffset_i32ptr_bytes,
                    dataLength_i32,
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
                const address = readAddress(jsvm_env, addressOffset_i32ptr_address);
                const result = jsvm_env.callDelegate(
                    gas_limit_i64,
                    address,
                    dataOffset_i32ptr_bytes,
                    dataLength_i32,
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
                const address = readAddress(jsvm_env, addressOffset_i32ptr_address);

                const result = jsvm_env.callStatic(
                    gas_limit_i64,
                    address,
                    dataOffset_i32ptr_bytes,
                    dataLength_i32,
                    // outputOffset_i32ptr_bytes,
                    // outputLength_i32,
                );

                logger.debug('callStatic', [gas_limit_i64, addressOffset_i32ptr_address, dataOffset_i32ptr_bytes, dataLength_i32], [result], getCache(), getMemory());
                return result;
            },
            storageStore: function (pathOffset_i32ptr_bytes32, valueOffset_i32ptr_bytes32) {
                const key = jsvm_env.loadMemory(pathOffset_i32ptr_bytes32);
                const value = jsvm_env.loadMemory(valueOffset_i32ptr_bytes32);
                jsvm_env.storageStore(key, value);

                logger.debug('storageStore', [pathOffset_i32ptr_bytes32, valueOffset_i32ptr_bytes32], [key, value], getCache(), getMemory());
            },
            storageLoad: function (pathOffset_i32ptr_bytes32, resultOffset_i32ptr_bytes32) {
                const key = jsvm_env.loadMemory(pathOffset_i32ptr_bytes32);
                const value = jsvm_env.storageLoad(key);
                jsvm_env.storeMemory(value, resultOffset_i32ptr_bytes32);

                logger.debug('storageLoad', [pathOffset_i32ptr_bytes32, resultOffset_i32ptr_bytes32], [value], getCache(), getMemory());
            },
            getCaller: function (resultOffset_i32ptr_address) {
                const address = jsvm_env.getCaller();
                jsvm_env.storeMemory(address, resultOffset_i32ptr_address);
                logger.debug('getCaller', [resultOffset_i32ptr_address], [address], getCache(), getMemory());
            },
            getCallValue: function (resultOffset_i32ptr_u128) {
                const value = jsvm_env.getCallValue();
                jsvm_env.storeMemory(value, resultOffset_i32ptr_u128);
                logger.debug('getCallValue', [resultOffset_i32ptr_u128], [value], getCache(), getMemory());
            },
            codeCopy: function (resultOffset_i32ptr_bytes, codeOffset_i32, length_i32) {
                jsvm_env.codeCopy(resultOffset_i32ptr_bytes, codeOffset_i32, length_i32);
                logger.debug('codeCopy', [resultOffset_i32ptr_bytes, codeOffset_i32, length_i32], [], getCache(), getMemory());
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
                jsvm_env.storeMemory(value, resultOffset_i32ptr_address);
                logger.debug('getBlockCoinbase', [resultOffset_i32ptr_address], [value], getCache(), getMemory());
            },
            // result i32 Returns 0 on success, 1 on failure and 2 on revert
            create: function (
                valueOffset_i32ptr_u128,
                dataOffset_i32ptr_bytes,
                dataLength_i32,
                resultOffset_i32ptr_bytes,
            ) {
                const balance = parseInt(uint8ArrayToHex(
                    jsvm_env.loadMemory(valueOffset_i32ptr_u128, 32)
                ), 16);
                const address = jsvm_env.create(balance, dataOffset_i32ptr_bytes, dataLength_i32);
                jsvm_env.storeMemory(address, resultOffset_i32ptr_bytes);

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
                jsvm_env.storeMemory(value, resulltOffset_i32ptr_u256);

                logger.debug('getBlockDifficulty', [resulltOffset_i32ptr_u256], [value], getCache(), getMemory());
            },
            externalCodeCopy: function (
                addressOffset_i32ptr_address, // the memory offset to load the address from (address)
                resultOffset_i32ptr_bytes,
                codeOffset_i32,
                dataLength_i32,
            ) {
                const address = readAddress(jsvm_env, addressOffset_i32ptr_address);
                jsvm_env.externalCodeCopy(
                    address,
                    resultOffset_i32ptr_bytes,
                    codeOffset_i32,
                    dataLength_i32,
                )
                logger.debug('externalCodeCopy', [addressOffset_i32ptr_address,
                    resultOffset_i32ptr_bytes,
                    codeOffset_i32,
                    dataLength_i32
                ], [], getCache(), getMemory());
            },
            // Returns extCodeSize i32
            getExternalCodeSize: function (addressOffset_i32ptr_address) {
                const address = readAddress(jsvm_env, addressOffset_i32ptr_address);
                const result = jsvm_env.getExternalCodeSize(address);
                logger.debug('getBlockDifficulty', [addressOffset_i32ptr_address], [result], getCache(), getMemory());
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
                jsvm_env.storeMemory(value, resultOffset_i32ptr_u128);

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
                    dataOffset_i32ptr_bytes,
                    dataLength_i32,
                    numberOfTopics_i32,
                    topics,
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
                jsvm_env.storeMemory(address, resultOffset_i32ptr_address);
                logger.debug('getTxOrigin', [resultOffset_i32ptr_address], [address], getCache(), getMemory());
            },
            finish: function (dataOffset_i32ptr_bytes, dataLength_i32) {
                const res = jsvm_env.finish(dataOffset_i32ptr_bytes, dataLength_i32);
                logger.debug('finish', [dataOffset_i32ptr_bytes, dataLength_i32], [res], getCache(), getMemory());
                finishAction(res);
            },
            revert: function (dataOffset_i32ptr_bytes, dataLength_i32) {
                const res = jsvm_env.revert(dataOffset_i32ptr_bytes, dataLength_i32);
                console.log('revert');
                logger.debug('revert', [dataOffset_i32ptr_bytes, dataLength_i32], [res], getCache(), getMemory());
                revertAction(res);
            },
            // result dataSize i32
            getReturnDataSize: function () {
                const result = jsvm_env.getReturnDataSize();
                logger.debug('getReturnDataSize', [], [result], getCache(), getMemory());
                return result;
            },
            returnDataCopy: function (resultOffset_i32ptr_bytes, dataOffset_i32, length_i32) {
                jsvm_env.returnDataCopy(resultOffset_i32ptr_bytes, dataOffset_i32, length_i32);
                logger.debug('returnDataCopy', [resultOffset_i32ptr_bytes, dataOffset_i32, length_i32], [], getCache(), getMemory());
            },
            selfDestruct: function (addressOffset_i32ptr_address) {
                const address = readAddress(jsvm_env, addressOffset_i32ptr_address);
                jsvm_env.selfDestruct(address);
                logger.debug('selfDestruct', [addressOffset_i32ptr_address], [], getCache(), getMemory());
                finishAction();
            },
            // result blockTimestamp i64,
            getBlockTimestamp: function () {
                const result = jsvm_env.getBlockTimestamp();
                logger.debug('getBlockTimestamp', [], [result], getCache(), getMemory());
                return result;
            }
        }
    }
}

function readAddress(jsvm_env, addressOffset) {
    const address = jsvm_env.loadMemory(addressOffset);
    // rigth -> left shift
    let lsAddress = new Uint8Array(32);
    lsAddress.set(address.slice(0, 20), 12);
    return lsAddress;
}

function comparify(value) {
    if (value instanceof Uint8Array) return uint8ArrayToHex(value);
    if (value instanceof Object) return JSON.stringify(value);
    return value;
}

const getBlock = tag => jsvmi.blocks.get(tag);
const getLogs = () => jsvmi.logs;
// dev purposes:
const getPersistence = () => jsvmi.persistence;

module.exports = {deploy, runtime, runtimeSim, getBlock, getLogs, getPersistence};
