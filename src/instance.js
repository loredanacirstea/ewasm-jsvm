const { ethers } = require('ethers');
const { ERROR } = require('./constants');
const {Logger, logg} = require('./config');
const {
    encodeWithSignature,
    encode,
    decode,
    uint8ArrayToHex,
    hexToUint8Array,
    newi64,
    randomAddress,
    extractAddress,
}  = require('./utils.js');
const {
    cloneContext,
    cloneLogs,
} = require('./persistence.js');

function instance ({
    vmname,
    vmcore,
    initializeImports,
    instantiateModule,
}) {
    // persistence = {accounts, logs, blocks}
    // Internal logger
    const logger = Logger.get(vmname)
    const ilogger = logger.spawn('internal');

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

    const runtime = (address, wabi) => {
        ilogger.debug('runtime', address);
        const runtimeCode = vmcore.persistence.accounts.get(address).runtimeCode;
        return initializeWrap(runtimeCode, wabi, address, true);
    }

    const runtimeSim = (bytecode, wabi, address) => {
        address = address || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
        return initializeWrap(bytecode, wabi, address, true);
    }

    async function initializeWrap (bytecode, wabi=[], address, atRuntime = false) {
        bytecode = typeof bytecode === 'string' ? hexToUint8Array(bytecode) : bytecode;
        const opcodelogs = [];  // {logs: [], internal: {indexopcode: logs:[]}}

        ilogger.get('initializeWrap').debug(address);

        const getfname = (fabi) => !atRuntime ? 'constructor' : (fabi ? fabi.name : 'main');
        const _finishAction = finishAction(ilogger, vmcore.persistence, address, wabi);
        const _revertAction = revertAction(ilogger);
        const _ologger = ologger(log => {
            opcodelogs.push(log);
        }, address);
        const _startExecution = startExecution({
            vmcore,
            ilogger,
            ologger: _ologger,
            initializeImports,
            instantiateModule,
            finishAction: _finishAction,
            revertAction: _revertAction,
        });
        const _wrappedMainRaw = wrappedMainRaw({ilogger, persistence: vmcore.persistence, _startExecution, address, bytecode, getfname});
        const _wrappedMain = wrappedMain(_wrappedMainRaw, getfname, wabi, bytecode);

        const wrappedInstance = {
            main: _wrappedMain(),
            mainRaw: _wrappedMainRaw(),
            address,
            abi: wabi,
            bin: bytecode,
            logs: opcodelogs,
        }

        wabi.forEach(method => {
            if (method.name === 'constructor') return;
            if (method.type === 'fallback') {
                wrappedInstance[method.name] = _wrappedMain();
            } else {
                const signature = ethers.utils.id(signatureFull(method)).substring(0, 10);
                wrappedInstance[method.name] = _wrappedMain(signature, method);
            }
        })

        return wrappedInstance;
    }

    const _storeStateChanges = storeStateChanges(ilogger, vmcore.persistence);

    const finishAction = (ilogger, persistence, address, wabi) => currentPromise => answ => {
        if (!currentPromise)  throw new Error('No queued promise found.');
        let result;
        if (currentPromise.name === 'constructor') {
            ilogger.get('finishAction_constructor').debug(currentPromise.name, answ);
            currentPromise.cache.context[address].runtimeCode = answ;
            result = address;
        } else {
            const abi = wabi.find(abi => abi.name === currentPromise.name);
            ilogger.get('finishAction').debug(currentPromise.name, answ);
            result = answ && abi && abi.outputs ? decode(abi.outputs, answ) : answ;
        }
        _storeStateChanges({accounts: currentPromise.cache.context, logs: currentPromise.cache.logs});
        currentPromise.resolve(result);
        currentPromise = null;
    }

    const revertAction = (ilogger) => currentPromise => answ => {
        if (!currentPromise) throw new Error('No queued promise found.');
        const error = new Error('Revert: ' + uint8ArrayToHex(answ));
        ilogger.get('revertAction').debug(currentPromise.name, answ);
        currentPromise.reject(error);
        currentPromise = null;
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

    const wrappedMainRaw = ({ilogger, persistence, _startExecution, address, bytecode, getfname}) => (fabi) => (txInfo, existingCache = {}) => new Promise((resolve, reject) => {
        txInfo = {...txInfo};  // TODO immutable
        txInfo.to = txInfo.to || address;

        const cache = buildCache(existingCache);
        cache.context[txInfo.from] = persistence.accounts.get(txInfo.from);
        cache.context[txInfo.to] = persistence.accounts.get(txInfo.to);
        // constructor TODO: check if constructor
        if (!cache.context[txInfo.to].runtimeCode) {
            cache.context[txInfo.to].runtimeCode = txInfo.data;
            cache.context[txInfo.to].storage = {};
        }
        // needed, otherwise it cycles;
        cache.context[txInfo.from].empty = false;
        cache.context[txInfo.to].empty = false;

        let currentPromise = {
            resolve, reject,
            name: getfname(fabi),
            txInfo,
            gas: {limit: txInfo.gasLimit, price: txInfo.gasPrice, used: newi64(0)},
            data: typeof txInfo.data === 'string' ? hexToUint8Array(txInfo.data) : txInfo.data,
            cache
        };
        currentPromise.txInfo.data = currentPromise.data;
        currentPromise.txInfo.to = address;
        if (!currentPromise.cache.context[txInfo.to]) {
            currentPromise.cache.context[txInfo.to] = persistence.accounts.get(txInfo.to);
            currentPromise.cache.context[txInfo.to].empty = false;
        }
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
        }

        const internalCallWrapContinue = async () => {
            const { index, newtx, context, logs } = currentPromise.interruptTxObj;
            ilogger.get('internalCallWrapContinue').debug(index);

            const wmodule = await runtime(newtx.to, []);
            let result = {};
            currentPromise.cache.data[index] = newtx;
            try {
                result.data = await wmodule.mainRaw(newtx, {context, logs});
                result.success = 1;
            } catch (e) {
                result.success = 0;
            }
            currentPromise.cache.data[index].result = result;
            currentPromise.interruptTxObj = {};

            // restart execution from scratch with updated cache
            // TODO: get gas left and forward it
            __startExecution();
        }

        const asyncResourceWrap = (account) => {
            currentPromise.interruptResourceObj = {account};
        }

        const asyncResourceWrapContinue = async() => {
            const data = persistence.accounts.get(currentPromise.interruptResourceObj.account);
            // We must delete this, to avoid requesting the resource over and over again
            delete data.empty;
            currentPromise.cache.context[currentPromise.interruptResourceObj.account] = data;
            ilogger.get('asyncResourceWrapContinue').debug(data.account, data.balance, Object.keys(currentPromise.cache.context));
            currentPromise.interruptResourceObj = {};

            // restart execution from scratch with updated cache
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

        const calldataTypes = (wabi.find(abi => abi.name === fname) || {}).inputs;
        const calldata = signature ? encodeWithSignature(signature, calldataTypes, args) : encode(calldataTypes, args);
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
        ologger,
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

        const getMemory = () => currentPromise.minstance.exports.memory

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

        instantiateModule(bytecode, importObj).then(wmodule => {
            currentPromise.minstance = wmodule.instance;
            ologger.debug('--', [], [], getCache(), getMemory());
            try {
                wmodule.instance.exports.main();
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
    const [name, input, output, cache, memory] = args;
    const {context, logs, data} = cache;
    const clonedContext = cloneContext(context);
    const clonedLogs =  cloneLogs(logs);
    const currentContext = clonedContext[address] || {};
    clonedMemory = hexToUint8Array(uint8ArrayToHex(new Uint8Array(memory.buffer)));
    const log = {name, input, output, memory: clonedMemory, logs: clonedLogs, context: clonedContext, contract: currentContext};
    callback(log);
    // we return nothing, because we don't print anything;
    return;
});

function comparify(value) {
    if (value instanceof Uint8Array) return uint8ArrayToHex(value);
    if (value instanceof Object) return JSON.stringify(value);
    return value;
}

module.exports = instance;
