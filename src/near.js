const { ERROR } = require('./constants');
const {
    cloneContext,
    cloneLogs,
    cloneStorage,
    cloneContract,
} = require('./persistence.js');
const {
    uint8ArrayToHex,
    hexToUint8Array,
    extractAddress,
    toBN,
    newi32,
    instantiateWasm,
}  = require('./utils.js');

const bigint2int = val => parseInt(val.toString());

function vmcore(initPersistence, initBlocks, initLogs, Logger) {
    const persistence = initPersistence();
    const blocks = initBlocks();
    const chainlogs = initLogs();

    const transferValue = persistenceApi => (from, to, value) => {
        Logger.get('jsvm').get('transferValue').debug(from, to, value, typeof value);
        const parsedValue = toBN(value);
        const fromBalance = persistenceApi.get(from).balance;
        const toBalance = persistenceApi.get(to).balance;
        Logger.get('jsvm').get('transferValue').debug('---', fromBalance, fromBalance.toNumber(), toBalance.toNumber(), parsedValue.toNumber());
        if (fromBalance.lt(parsedValue)) throw new Error('Not enough balance.');

        persistenceApi.updateBalance(to, toBalance.add(parsedValue));
        persistenceApi.updateBalance(from, fromBalance.sub(parsedValue));
    }

    const call = (txObj, internalCallWrap, asyncResourceWrap, getMemory, getCache, getRegister) => {
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
            result.getStorage = (key) => {
                return result.storage[key];
            }
            result.setStorage = (key, value) => {
                result.storage[key] = value;
                persistenceWrap.set(result);
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
            limit: toBN(txObj.gasLimit || 4000000),
            price: txObj.gasPrice || toBN(1),
            used: toBN(0),
        }
        const getGas = () => gas;
        const useGas = gas => {
            gas.used = gas.used.add(gas);
        }
        txInfo.gas = gas;

        const block = blocks.set();
        let memoryMap;
        const getNewMemory = () => {
            if (!memoryMap) memoryMap = new WebAssembly.Memory({ initial: 2 }); // Size is in pages.
            return memoryMap;
        }

        // const register = [];
        // const getRegister = () => {
        //     return register;
        // }
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
            getRegister
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
        getRegister,
    ) => {
        let currentCacheIndex = 0;
        const storageMap = () => getInstance().storage;

        // let memoryMap;
        // getMemory = () => {
        //     if (!memoryMap) memoryMap = new WebAssembly.Memory({ initial: 2 }); // Size is in pages.
        //     return memoryMap;
        // }

        const storeMemory = (bytes, offset, size) => {
            let mem = new Uint8Array(getMemory().buffer);
            for (let i = 0; i < size; i++) {
                mem[offset + i] = bytes[i];
            }
        }
        const loadMemory = (offset, size) => {
            let res = (getMemory().buffer).slice(offset, offset + size)
            return new Uint8Array(res);
        }
        const storageStore = (key, value) => {
            Logger.get('jsvm').get('storage').debug('store', key, value);
            key = uint8ArrayToHex(key);
            getInstance().setStorage(key, value);
        }
        const storageLoad = (key) => {
            Logger.get('jsvm').get('storage').debug('load', key);
            key = uint8ArrayToHex(key);
            return getInstance().getStorage(key) || hexToUint8Array('0x0000000000000000000000000000000000000000000000000000000000000000');
        }

        const vmapi = {
            // i32ptr is u128
            // 33 methods
                storeMemory: function (bytes, offset) {
                    Logger.get('jsvm').get('memory').debug('store', bytes, offset);
                    storeMemory(bytes, bigint2int(offset), 32);
                },
                storeMemory8: function (bytes, offset) {
                    storeMemory(bytes, bigint2int(offset), 1);
                },
                multiStoreMemory: function(bytes, offset) {
                    Logger.get('jsvm').get('memory').debug('store', bytes, offset);
                    storeMemory(bytes, bigint2int(offset), bytes.length);
                },
                loadMemory: function (offset) {
                    Logger.get('jsvm').get('memory').debug('load', offset);
                    return loadMemory(bigint2int(offset), 32);
                },
                multiLoadMemory: function (offset, length) {
                    Logger.get('jsvm').get('memory').debug('load', offset);
                    return loadMemory(bigint2int(offset), bigint2int(length));
                },
                storageStore: function (key_uint8array, value_uint8array) {
                    storageStore(key_uint8array, value_uint8array);
                },
                storageLoad: function (key_uint8array) {
                    return storageLoad(key_uint8array);
                },
                getAddress: function () {
                    const size = 32;
                    const address = new Uint8Array(size);
                    address.set(hexToUint8Array(getInstance().address), size - 20);
                    Logger.get('jsvm').get('getAddress').debug(address);
                    return address;
                },
                log: function (
                    dataOffset,
                    dataLength,
                    numberOfTopics,
                    topics,
                ) {
                    Logger.get('jsvm').get('log').debug(topics);
                    const data = loadMemory(bigint2int(dataOffset), bigint2int(dataLength));
                    chainlogs.set({
                        address: vmapi.getAddress(),
                        blockNumber: block.number,
                        data,
                        topics: topics.slice(0, numberOfTopics),
                    });
                    console.log('log data', data);
                },
                /**
                * Reads input to the contract call into the register. Input is expected to be in JSON-format.
                * If input is provided saves the bytes (potentially zero) of input into register. If input is
                * not provided writes 0 bytes into the register.
                **/
                input: function (register_id) {
                    console.log('txObj.data', txObj.data);
                    if (txObj.data) {
                        // save into register
                        getRegister()[register_id] = new Uint8Array(txObj.data);
                    }
                    else getRegister()[register_id] = new Uint8Array(32);
                },
                register_len: function(register_id) {
                    return BigInt(getRegister()[register_id].length);
                },
                read_register: function(register_id, ptr) {
                    const data = getRegister()[register_id];
                    vmapi.multiStoreMemory(data, ptr);
                    return data;
                },
                panic_utf8: function(len, ptr) {

                },
                useGas: function (amount) {
                    useGas(bigint2int(amount));
                },
        }
        return vmapi;
    }

    const wrappersist = {
        accounts: persistence,
        blocks,
        logs: chainlogs,
    }

    return { persistence: wrappersist, call }

}

const instantiateModule = instantiateWasm;

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
    // getRegister,
) => {
    const register = [];
    const getRegister = () => {
        return register;
    }

    const jsvm_env = vmcore.call(txObj, internalCallWrap, asyncResourceWrap, getMemory, getCache, getRegister);
    const vmapi = {
      vm: {
        restoreState() {
            logger.debug('restoreState', [], [], getCache(), getMemory(), getRegister());
        },
        outcome() {
            logger.debug('outcome', [], [], getCache(), getMemory(), getRegister());
        },
        // saveContext() {
        //   vm.save_context();
        // },
        // restoreContext() {
        //   vm.restore_context();
        // },
        setCurrent_account_id(s) {
            logger.debug('setCurrent_account_id', [], [], getCache(), getMemory(), getRegister());
        },
        setInput(s) {
            logger.debug('setInput', [], [], getCache(), getMemory(), getRegister());
        },
        setSigner_account_id(s) {
            logger.debug('setSigner_account_id', [], [], getCache(), getMemory(), getRegister());
        }, // string
        /// The public key that was used to sign the original transaction that led to
        /// this execution.
        setSigner_account_pk(s) {
            logger.debug('setSigner_account_pk', [], [], getCache(), getMemory(), getRegister());
        }, // string base58
        setPredecessor_account_id(s) {
            logger.debug('setPredecessor_account_id', [], [], getCache(), getMemory(), getRegister());
        }, // string
        setBlock_index(block_height) {
            logger.debug('setBlock_index', [], [], getCache(), getMemory(), getRegister());
        }, // u128
        setBlock_timestamp(stmp) {
            logger.debug('setBlock_timestamp', [], [], getCache(), getMemory(), getRegister());
        },
        setAccount_balance(lo, hi) {
          //TODO: actually  u128
          logger.debug('setAccount_balance', [], [], getCache(), getMemory(), getRegister());
        },
        setAccount_locked_balance(lo, hi) {
            logger.debug('setAccount_locked_balance', [], [], getCache(), getMemory(), getRegister());
        },
        setStorage_usage(amt) {
            logger.debug('setStorage_usage', [], [], getCache(), getMemory(), getRegister());
        },
        setAttached_deposit(lo, hi) {
            logger.debug('setAttached_deposit', [], [], getCache(), getMemory(), getRegister());
        },
        setPrepaid_gas(_u64) {
            logger.debug('setPrepaid_gas', [], [], getCache(), getMemory(), getRegister());
        },
        setRandom_seed(s) {
            logger.debug('setRandom_seed', [], [], getCache(), getMemory(), getRegister());
        },
        setIs_view(b) {
            logger.debug('setIs_view', [], [], getCache(), getMemory(), getRegister());
        },
        setEpoch_height(_u64) {
            logger.debug('setEpoch_height', [], [], getCache(), getMemory(), getRegister());
        },
        // setOutput_data_receivers(arr) {
        //   vm.set_output_data_receivers(arr);
        // },
      },
      env: {
        memory: getMemory(),
        /// #################
        /// # Registers API #
        /// #################
        // write_register(data_len, data_ptr, register_id) {
        //   return vm.write_register(data_len, data_ptr, register_id);
        // },
        abort() {
            logger.debug('abort', [], [], getCache(), getMemory(), getRegister());
        },
        read_register(register_id, ptr) {
            const data = jsvm_env.read_register(register_id, ptr);
            logger.debug('read_register', [register_id, ptr], [data], getCache(), getMemory(), getRegister());
        },
        register_len(register_id) {
            const result = jsvm_env.register_len(register_id);
            logger.debug('register_len', [register_id], [result], getCache(), getMemory(), getRegister());
            return result;
        },
        // ###############
        // # Context API #
        // ###############
        current_account_id(register_id) {
            logger.debug('current_account_id', [], [], getCache(), getMemory(), getRegister());
        },
        signer_account_id(register_id) {
            logger.debug('signer_account_id', [], [], getCache(), getMemory(), getRegister());
        },
        signer_account_pk(register_id) {
            logger.debug('signer_account_pk', [], [], getCache(), getMemory(), getRegister());
        },
        predecessor_account_id(register_id) {
            logger.debug('predecessor_account_id', [], [], getCache(), getMemory(), getRegister());
        },
        input(register_id) {
            jsvm_env.input(register_id);
            logger.debug('input', [register_id], [], getCache(), getMemory(), getRegister());
        },
        block_index() {
            logger.debug('block_index', [], [], getCache(), getMemory(), getRegister());
        },
        block_timestamp() {
            logger.debug('block_timestamp', [], [], getCache(), getMemory(), getRegister());
        },
        epoch_height() {
            logger.debug('epoch_height', [], [], getCache(), getMemory(), getRegister());
        },
        storage_usage() {
            logger.debug('storage_usage', [], [], getCache(), getMemory(), getRegister());
        },

        // #################
        // # Economics API #
        // #################
        account_balance(balance_ptr) {
            logger.debug('account_balance', [], [], getCache(), getMemory(), getRegister());
        },
        account_locked_balance(ptr) {
            logger.debug('account_locked_balance', [], [], getCache(), getMemory(), getRegister());
        },
        attached_deposit(balance_ptr) {
            logger.debug('attached_deposit', [], [], getCache(), getMemory(), getRegister());
        },
        prepaid_gas() {
            logger.debug('prepaid_gas', [], [], getCache(), getMemory(), getRegister());
        },
        used_gas() {
            logger.debug('used_gas', [], [], getCache(), getMemory(), getRegister());
        },

        // ############
        // # Math API #
        // ############
        random_seed(register_id) {
            logger.debug('random_seed', [], [], getCache(), getMemory(), getRegister());
        },
        sha256(value_len, value_ptr, register_id) {
            logger.debug('sha256', [], [], getCache(), getMemory(), getRegister());
        },
        keccak256(value_len, value_ptr, register_id) {
            logger.debug('keccak256', [], [], getCache(), getMemory(), getRegister());
        },
        keccak512(value_len, value_ptr, register_id) {
            logger.debug('keccak512', [], [], getCache(), getMemory(), getRegister());
        },

        // #####################
        // # Miscellaneous API #
        // #####################
        value_return(value_len, value_ptr) {
            const data = jsvm_env.multiLoadMemory(value_ptr, value_len);
            logger.debug('value_return', [value_len, value_ptr], [data], getCache(), getMemory(), getRegister());
            finishAction(data);
        },
        panic() {
            logger.debug('panic', [], [], getCache(), getMemory(), getRegister());
            throw new Error('Panic');
        },
        panic_utf8(value_len, value_ptr) {
            const data = jsvm_env.multiLoadMemory(value_ptr, value_len);
            logger.debug('panic_utf8', [len, ptr], [data], getCache(), getMemory(), getRegister());
            throw new Error(data);
        },
        log_utf8(len, ptr) {
            jsvm_env.log(ptr, len, 0, []);
            logger.debug('log_utf8', [len, ptr], [], getCache(), getMemory(), getRegister());
        },
        log_utf16(len, ptr) {
            jsvm_env.log(ptr, len, 0, []);
            logger.debug('log_utf16', [len, ptr], [], getCache(), getMemory(), getRegister());
        },

        // ################
        // # Promises API #
        // ################
        promise_create(
          account_id_len,
          account_id_ptr,
          method_name_len,
          method_name_ptr,
          arguments_len,
          arguments_ptr,
          amount_ptr,
          gas
        ) {
            logger.debug('promise_create', [], [], getCache(), getMemory(), getRegister());
        },
        promise_then(
          promise_index,
          account_id_len,
          account_id_ptr,
          method_name_len,
          method_name_ptr,
          arguments_len,
          arguments_ptr,
          amount_ptr,
          gas
        ) {
            logger.debug('promise_then', [], [], getCache(), getMemory(), getRegister());
        },
        promise_and(promise_idx_ptr, promise_idx_count) {
            logger.debug('promise_and', [], [], getCache(), getMemory(), getRegister());
        },
        promise_results_count() {
            logger.debug('promise_results_count', [], [], getCache(), getMemory(), getRegister());
        },
        promise_result(result_idx, register_id) {
            logger.debug('promise_result', [], [], getCache(), getMemory(), getRegister());
        },
        promise_return(promise_id) {
            logger.debug('promise_return', [], [], getCache(), getMemory(), getRegister());
        },
        promise_batch_create(account_id_len, account_id_ptr) {
            logger.debug('promise_batch_create', [], [], getCache(), getMemory(), getRegister());
        },
        promise_batch_then(
          promise_index,
          account_id_len,
          account_id_ptr
        ) {
            logger.debug('promise_batch_then', [], [], getCache(), getMemory(), getRegister());
        },

        // #######################
        // # Promise API actions #
        // #######################
        promise_batch_action_create_account(promise_index) {
            logger.debug('promise_batch_action_create_account', [], [], getCache(), getMemory(), getRegister());
        },
        promise_batch_action_deploy_contract(
          promise_index,
          code_len,
          code_ptr
        ) {
            logger.debug('promise_batch_action_deploy_contract', [], [], getCache(), getMemory(), getRegister());
        },
        promise_batch_action_function_call(
          promise_index,
          method_name_len,
          method_name_ptr,
          arguments_len,
          arguments_ptr,
          amount_ptr,
          gas
        ) {
            logger.debug('promise_batch_action_function_call', [], [], getCache(), getMemory(), getRegister());
        },
        promise_batch_action_transfer(
          promise_index,
          amount_ptr
        ) {
            logger.debug('promise_batch_action_transfer', [], [], getCache(), getMemory(), getRegister());
        },
        promise_batch_action_stake(
          promise_index,
          amount_ptr,
          public_key_len,
          public_key_ptr
        ) {
            logger.debug('promise_batch_action_stake', [], [], getCache(), getMemory(), getRegister());
        },
        promise_batch_action_add_key_with_full_access(
          promise_index,
          public_key_len,
          public_key_ptr,
          nonce
        ) {
            logger.debug('promise_batch_action_add_key_with_full_access', [], [], getCache(), getMemory(), getRegister());
        },
        promise_batch_action_add_key_with_function_call(
          promise_index,
          public_key_len,
          public_key_ptr,
          nonce,
          allowance_ptr,
          receiver_id_len,
          receiver_id_ptr,
          method_names_len,
          method_names_ptr
        ) {
            logger.debug('promise_batch_action_add_key_with_function_call', [], [], getCache(), getMemory(), getRegister());
        },
        promise_batch_action_delete_key(
          promise_index,
          public_key_len,
          public_key_ptr
        ) {
            logger.debug('promise_batch_action_delete_key', [], [], getCache(), getMemory(), getRegister());
        },
        promise_batch_action_delete_account(
          promise_index,
          beneficiary_id_len,
          beneficiary_id_ptr
        ) {
            logger.debug('promise_batch_action_delete_account', [], [], getCache(), getMemory(), getRegister());
        },

        // ###############
        // # Storage API #
        // ###############
        storage_write(
          key_len,
          key_ptr,
          value_len,
          value_ptr,
          register_id
        ) {
            const key = jsvm_env.multiLoadMemory(key_ptr, key_len);
            console.log('storage_read key', key)
            const value = jsvm_env.multiLoadMemory(value_ptr, value_len);
            console.log('storage_read value', value)

            const existing = jsvm_env.storageLoad(key);
            let result;
            jsvm_env.storageStore(key, value);
            console.log('existing', existing);
            if (!existing) result = 0n;
            else {
                result = 1n;
                getRegister()[register_id] = existing;
            }

            logger.debug('storage_write', [key_len,
                key_ptr,
                value_len,
                value_ptr,
                register_id], [result], getCache(), getMemory(), getRegister());
            return result;
        },
        /*If key is used copies the content of the value into the `register_id`, even if the   content
        *   is zero bytes. Returns `1`;
        * * If key is not present then does not modify the register. Returns `0`;
        */
        storage_read(key_len, key_ptr, register_id) {
            console.log('storage_read', key_len, key_ptr, register_id)
            const key = jsvm_env.multiLoadMemory(key_ptr, key_len);
            console.log('storage_read key', key)
            const value = jsvm_env.storageLoad(key);
            console.log('storage_read value', value);
            let result;

            if (value) {
                getRegister()[register_id] = value;
                result = BigInt(1);
            } else {
                result = BigInt(0);
            }
            logger.debug('storage_read', [key_len, key_ptr, register_id], [result], getCache(), getMemory(), getRegister());
            return result;
        },
        storage_remove(key_len, key_ptr, register_id) {
            logger.debug('storage_remove', [], [], getCache(), getMemory(), getRegister());
        },
        storage_has_key(key_len, key_ptr) {
            logger.debug('storage_has_key', [], [], getCache(), getMemory(), getRegister());
        },
        // // Function for the injected gas counter. Automatically called by the gas meter.
        gas(gas_amount) {
            logger.debug('gas', [], [], getCache(), getMemory(), getRegister());
        },

        // Validator API
        validtor_stake(id_len, id_ptr, data_ptr) {
            logger.debug('validtor_stake', [], [], getCache(), getMemory(), getRegister());
        },
        validator_total_stake(data_ptr) {
            logger.debug('validator_total_stake', [], [], getCache(), getMemory(), getRegister());
        },
      },
    };

    return vmapi;
}

const decodeOutput = result => {
    return (result && result instanceof Uint8Array) ? result.map(v => String.fromCharCode(v)).join('') : result;
}

const encodeInput = (args, functionAbi) => {
    let _calldata = {};
    args.forEach((arg, i) => {
        _calldata[functionAbi.inputs[i].name] = arg;
    });
    _calldata = JSON.stringify(_calldata);
    const calldata = new Uint8Array(_calldata.split('').map(v => v.charCodeAt(0)));
    return calldata;
}

const entrypoint = functionAbi => functionAbi.name;

module.exports = {initializeImports, instantiateModule, vmcore, decodeOutput, encodeInput, entrypoint};

