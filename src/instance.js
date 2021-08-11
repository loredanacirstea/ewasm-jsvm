const { ethers } = require('ethers');
const { ERROR, BASE_TX_COST } = require('./constants');
const {Logger, logg} = require('./config');
const {
    encodeWithSignature,
    encode,
    decode,
    uint8ArrayToHex,
    hexToUint8Array,
    randomAddress,
    extractAddress,
    BN2uint8arr,
    toBN,
}  = require('./utils.js');
const {
    cloneContext,
    cloneLogs,
} = require('./persistence.js');

const MAX_RECURSION_LIMIT = 10000;

function instance ({
    vmname,
    vmcore,
    initializeImports,
    instantiateModule,
    decodeOutput,
    encodeInput,
    entrypoint,
    stateProvider,
}) {
    // persistence = {accounts, logs, blocks}
    // Internal logger
    const ilogger = Logger.get(vmname);

    const getResource = async (address, stateProvider) => {
        let data = vmcore.persistence.accounts.get(address);
        // Get account data from provider
        if (data.empty && stateProvider) {
            const runtimeCode = await stateProvider.getCode(address);
            const balance = await stateProvider.getBalance(address);
            data.runtimeCode = typeof runtimeCode === 'string' ? hexToUint8Array(runtimeCode) : runtimeCode;
            data.balance = toBN(balance);

            delete data.empty;
            vmcore.persistence.accounts.set(data);
        }
        return data;
    }

    const deploy = (bytecode, wabi) => async (...args) => {
        ilogger.debug('deploy', ...args);
        const address = randomAddress();
        const constructori = await initializeWrap(bytecode, wabi, address, false);
        // TODO: constructor args
        const txInfo = args[args.length - 1];
        await constructori.main(txInfo);
        ilogger.debug('deployed', address);
        const instance = await runtime(address, wabi);
        return instance;
    }

    const runtime = async (address, wabi) => {
        ilogger.debug('runtime', address);
        let account = await getResource(address, stateProvider);
        const runtimeCode = account.runtimeCode;
        return initializeWrap(runtimeCode, wabi, address, true);
    }

    const runtimeSim = (bytecode, wabi, address) => {
        address = address || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
        return initializeWrap(bytecode, wabi, address, true);
    }

    async function initializeWrap (bytecode, wabi=[], address, atRuntime = false) {
        bytecode = typeof bytecode === 'string' ? hexToUint8Array(bytecode) : bytecode;

        ilogger.get('initializeWrap').debug(address);

        if (!wabi.find(fabi => fabi.type === 'constructor')) {
            wabi.push({ name: 'constructor', type: 'constructor', stateMutability: 'nonpayable', inputs: [], outputs: []});
        }

        const getfname = (fabi) => !atRuntime ? 'constructor' : (fabi ? fabi.name : 'main');

        let wrappedInstance = {
            address,
            logs: [],
            abi: wabi,
            bin: bytecode,
        }
        const appendtxinfo = (obj) => {
            Object.assign(wrappedInstance, obj);
        }

        const _finishAction = finishAction(ilogger, vmcore.persistence, address, wabi, appendtxinfo);
        const _revertAction = revertAction(ilogger, vmcore.persistence, address, appendtxinfo);
        const _startExecution = startExecution({
            vmcore,
            ilogger,
            initializeImports,
            instantiateModule,
            finishAction: _finishAction,
            revertAction: _revertAction,
        });
        const _wrappedMainRaw = await wrappedMainRaw({ilogger, persistence: vmcore.persistence, _startExecution, address, bytecode, getfname});
        const _wrappedMain = await wrappedMain(_wrappedMainRaw, getfname, wabi, bytecode);

        wrappedInstance.main = await _wrappedMain();
        wrappedInstance.mainRaw = await _wrappedMainRaw();

        for (let method of wabi) {
            if (method.type === 'fallback') {
                wrappedInstance[method.name] = await _wrappedMain();
            } else if (method.name !== 'constructor') {
                const signature = ethers.utils.id(signatureFull(method)).substring(0, 10);
                wrappedInstance[method.name] = await _wrappedMain(signature, method);
            }
        }
        return wrappedInstance;
    }

    const _storeStateChanges = storeStateChanges(ilogger, vmcore.persistence);

    const finishAction = (ilogger, persistence, address, wabi, appendtxinfo) => currentPromise => ({result: answ, gas}, e) => {
        if (!currentPromise) {
            console.log('No queued promise found.'); // throw new Error('No queued promise found.');
            return;
        }
        if (currentPromise.resolved) {
            console.error('Promise already resolved');
            // throw new Error('Promise already resolved');
        }
        let result;
        if (currentPromise.name === 'constructor') {
            // ilogger.get('finishAction_constructor').debug(currentPromise.name, answ);
            currentPromise.cache.context[address].runtimeCode = answ;
            result = address;
        } else {
            const abi = wabi.find(abi => abi.name === currentPromise.name);
            ilogger.get('finishAction').debug(currentPromise.name, answ);
            if (decodeOutput && answ !== null) result = decodeOutput(answ);
            else result = answ !== null && typeof answ !== 'undefined' && abi && abi.outputs ? decode(abi.outputs, answ) : answ;
        }

        appendtxinfo({
            logs: currentPromise.opcodelogs,
            gas: gas,
        });

        if (!e) {
            _storeStateChanges({accounts: currentPromise.cache.context, logs: currentPromise.cache.logs});
            currentPromise.resolve(result);
        }
        else {
            currentPromise.reject(e);
        }
        currentPromise.resolved = true; // passed by reference

        // Needed for evm1 to stop execution
        return ERROR.STOP;
    }

    const revertAction = (ilogger, persistence, address, appendtxinfo) => currentPromise => ({result: answ, gas}) => {
        if (!currentPromise) {
            console.log('No queued promise found.'); // throw new Error('No queued promise found.');
            return;
        }
        if (currentPromise.resolved) {
            throw new Error('Promise already resolved');
        }
        const error = new Error('Revert: ' + uint8ArrayToHex(answ));
        ilogger.get('revertAction').debug(currentPromise.name, answ);
        appendtxinfo({logs: currentPromise.opcodelogs, gas});
        currentPromise.reject(error);
        currentPromise.resolved = true;
        return ERROR.STOP;
    }

    const buildCache = (existingCache) => {
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
        return cache;
    }

    const wrappedMainRaw = ({ilogger, persistence, _startExecution, address, bytecode, getfname}) => (fabi) => (txInfo, existingCache = {}) => new Promise(async (resolve, reject) => {
        txInfo = {...txInfo};  // TODO immutable
        txInfo.to = txInfo.to || address;

        const cache = buildCache(existingCache);
        // If we have previous cache, we keep it
        if (!cache.context[txInfo.from]) {
            cache.context[txInfo.from] = await getResource(txInfo.from, stateProvider);
        }

        if (!cache.context[txInfo.to]) {
            cache.context[txInfo.to] = await getResource(txInfo.to, stateProvider);
        }
        // constructor TODO: check if constructor
        if (!cache.context[txInfo.to].runtimeCode) {
            cache.context[txInfo.to].runtimeCode = txInfo.data;
            cache.context[txInfo.to].storage = {};
        }
        // needed, otherwise it cycles;
        cache.context[txInfo.from].empty = false;
        cache.context[txInfo.to].empty = false;
        txInfo.gasUsed = toBN(BASE_TX_COST);

        let currentPromise = {
            resolve, reject,
            name: getfname(fabi),
            methodName: entrypoint ? entrypoint(fabi) : 'main',
            txInfo,
            data: typeof txInfo.data === 'string' ? hexToUint8Array(txInfo.data) : txInfo.data,
            cache
        };
        currentPromise.txInfo.data = currentPromise.data;
        currentPromise.txInfo.to = address;
        if (!currentPromise.cache.context[txInfo.to]) {
            currentPromise.cache.context[txInfo.to] = await getResource(txInfo.to, stateProvider);
            currentPromise.cache.context[txInfo.to].empty = false;
        }

        currentPromise.opcodelogs = [];
        currentPromise.ologger = ologger(log => {
            currentPromise.opcodelogs.push(log);
        }, address);
        currentPromise.ologger.clear = () => currentPromise.opcodelogs = [];
        currentPromise.ologger.get = () => currentPromise.opcodelogs;
        currentPromise.count = 0;

        const __startExecution = () => _startExecution({
            currentPromise,
            bytecode,
            getCache,
            txInfo,
            internalCallWrap,
            internalCallWrapContinue,
            asyncResourceWrap,
            asyncResourceWrapContinue,
        });

        ilogger.get('tx').debug('wrappedMainRaw--' + currentPromise.name, txInfo);

        const getCache = () => {
            // TODO somehow this gets called after finishAction
            // need to see where
            return currentPromise.cache;
        }

        const internalCallWrap = (index, dataObj, context, logs) => {
            const newtx = {...currentPromise.txInfo, ...lowtx2hex(dataObj)}
            currentPromise.parent = true;
            currentPromise.interruptTxObj = { index, newtx, context, logs };
            ilogger.debug('internalCallWrap');
        }

        const internalCallWrapContinue = async () => {
            const { index, newtx, context, logs } = currentPromise.interruptTxObj;
            ilogger.get('internalCallWrapContinue').debug(index);

            const wmodule = await runtime(newtx.to, [], stateProvider);
            let result = {};
            currentPromise.cache.data[index] = newtx;
            try {
                result.data = await wmodule.mainRaw(newtx, {context, logs});
                result.success = 1;
            } catch (e) {
                console.error(e);
                result.success = 0;
            }
            currentPromise.cache.data[index].result = result;
            currentPromise.interruptTxObj = {};

            // restart execution from scratch with updated cache
            // TODO: get gas left and forward it
            currentPromise.ologger.clear();
            __startExecution();
        }

        const asyncResourceWrap = (account, storageKeys) => {
            currentPromise.interruptResourceObj = {account, storageKeys};
            currentPromise.count += 1;
            ilogger.debug('asyncResourceWrap');
        }

        const asyncResourceWrapContinue = async() => {
            const {account: _account, storageKeys} = currentPromise.interruptResourceObj;
            let data = _account;
            let account = _account;
            if (typeof _account === 'string') {
                data = await getResource(_account, stateProvider);
            }
            else {
                account = data.address;
            }

            // Get storage values if needed
            if (storageKeys) {
                for (let key of storageKeys) {
                    let value;
                    if (stateProvider) {
                        value = await stateProvider.getStorageAt(account, key);
                    }
                    else {
                        value = '0x0000000000000000000000000000000000000000000000000000000000000000';
                    }
                    data.storage[key] = hexToUint8Array(value);
                }
            }

            // We must delete this, to avoid requesting the resource over and over again
            delete data.empty;
            currentPromise.cache.context[account] = data;
            ilogger.get('asyncResourceWrapContinue').debug(data.account, data.balance, Object.keys(currentPromise.cache.context));
            currentPromise.interruptResourceObj = {};

            if (currentPromise.count > MAX_RECURSION_LIMIT) throw new Error('Max recursion limit reached.');

            // restart execution from scratch with updated cache
            currentPromise.ologger.clear();
            __startExecution();
        }

        __startExecution();
    });

    const wrappedMain = (_wrappedMainRaw, getfname, wabi, bytecode) => (signature, fabi) => (...input) => {
        const fname = getfname(fabi);
        const args = input.slice(0, input.length - 1);
        const txInfo = input[input.length - 1];
        txInfo.origin = txInfo.origin || txInfo.from;
        txInfo.value = txInfo.value || '0x00';

        let calldata;
        if (encodeInput) calldata = encodeInput(args, fabi);
        else {
            const calldataTypes = (wabi.find(abi => abi.name === fname || (abi.type === fname && fname === 'constructor')) || {}).inputs;
            calldata = signature ? encodeWithSignature(signature, calldataTypes, args) : encode(calldataTypes, args);
        }
        txInfo.data = calldata;

        if (!signature && !fabi && txInfo.data.length === 0) {
            // constructor
            txInfo.data = bytecode;
        }
        return _wrappedMainRaw(fabi) (txInfo);
    }

    const startExecution = ({
        vmcore,
        ilogger,
        initializeImports,
        instantiateModule,
        finishAction,
        revertAction,
    }) => ({
        currentPromise,
        bytecode,
        getCache,
        internalCallWrap,
        internalCallWrapContinue,
        asyncResourceWrap,
        asyncResourceWrapContinue,
    }) => {
        ilogger.get('tx').debug('startExecution', currentPromise.txInfo);
        ilogger.debug('startExecution', Object.keys(currentPromise.cache.context));

        let memoryMap;
        const _getMemory = () => {
            if (!memoryMap) memoryMap = new WebAssembly.Memory({ initial: 2 }); // Size is in pages.
            return memoryMap;
        }

        const getMemory = () => {
            if (currentPromise.minstance) return currentPromise.minstance.exports.memory;
            return _getMemory();
        }

        const ologger = currentPromise.ologger;

        const importObj = initializeImports(
            vmcore,
            currentPromise.txInfo,
            internalCallWrap,
            asyncResourceWrap,
            getMemory,
            getCache,
            finishAction(currentPromise),
            revertAction(currentPromise),
            ologger,
        );
        return instantiateModule(bytecode, importObj).then(async wmodule => {
            currentPromise.minstance = wmodule.instance;
            currentPromise.importObj = importObj; // near memory access
            ologger.debug('--', [], [], getCache());

            // _NEAR constructor
            if (!wmodule.instance.exports[currentPromise.methodName]) {
                return finishAction(currentPromise)(bytecode);
            }

            let result;

            try {
                result = await wmodule.instance.exports[currentPromise.methodName]();
            } catch (e) {
                console.log(e.message);

                switch(e.message) {
                    case ERROR.ASYNC_CALL:
                        // wasm execution stopped, so it can be restarted
                        // TODO - restart needs to wait until call result
                        internalCallWrapContinue();
                        return;
                    case ERROR.ASYNC_RESOURCE:
                        asyncResourceWrapContinue();
                        return;
                    case ERROR.STOP:
                        // this is how we stop the wasm module execution
                        // for return, revert, etc.
                        return;
                    default:
                        // internal errors - throw error after logs are set
                        finishAction(currentPromise)({result: null}, e);
                        return;
                }
            }

            // _NEAR doesn't have a finish opcode for functions that do not return, it just returns here
            if (!currentPromise.resolved) {
                finishAction(currentPromise)(result);
            }
        });
    }


    const vmapi = {
        deploy,
        runtime,
        runtimeSim,
        getBlock: tag => vmcore.persistence.blocks.get(tag),
        getLogs: () => vmcore.persistence.logs,
        // dev purposes
        getPersistence: () => vmcore.persistence.accounts,
    }

    return vmapi;
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

const storeStateChanges = (ilogger, persistence) => (context) => {
    ilogger.get('context').debug('storeStateChanges', context.accounts);
    ilogger.get('logs').debug('storeStateChanges', context.logs);
    persistence.accounts.setBulk(context.accounts);
    persistence.logs.setBulk(context.logs);
}

const ologger = (callback, address) => logg('opcodes', Logger.LEVELS.DEBUG, (...args) => {
    const [name, input, output, cache, stack, changed, position, gasCost, addlGasCost = 0, refundedGas = 0] = args;
    const {context, logs, data} = cache;
    const clonedContext = cloneContext(context);
    const clonedLogs =  cloneLogs(logs);
    const currentContext = clonedContext[address] || {};
    const clonedStack = stack ? stack.map(val => {
        // BN or array
        return val instanceof Uint8Array ? val : BN2uint8arr(val);
    }) : [];

    const log = {name, input, output, logs: clonedLogs, context: clonedContext, contract: currentContext, stack: clonedStack, changed, position: position || 0, gasCost, addlGasCost, refundedGas};
    callback(log);

    if (Logger.getLevel() === 'DEBUG') return log;
    return;
});

function comparify(value) {
    if (value instanceof Uint8Array) return uint8ArrayToHex(value);
    if (value instanceof Object) return JSON.stringify(value);
    return value;
}

module.exports = instance;
