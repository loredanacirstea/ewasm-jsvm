const { randomHash, randomAddress, toBN, uint8ArrayToHex, hexToUint8Array } = require('./utils.js');

const persistenceMock = (accounts = {}) => {
    const emptyAccount = (address) =>  Object.assign({}, { address, balance: toBN(0), empty: true});

    // runtimeCode null - address not set / selfdestructed
    // runtimeCode.length === 0 - address set, not contract

    const get = address => cloneContract(accounts[address] || emptyAccount(address));

    const set = ({ address, runtimeCode, storage, balance = 0, removed }) => {
        // pathToWasm ?
        address = address || randomAddress();
        // if (accounts[address]) throw new Error('Address already exists');

        storage = storage || (runtimeCode ? {} : null);
        runtimeCode = runtimeCode || (removed ? undefined : new Uint8Array(0));
        accounts[address] = {
            address,
            runtimeCode,
            balance: toBN(balance),
            storage,
            empty: false,
        };
        return address;
    }

    const remove = address => {
        if (accounts[address].balance.gt(toBN(0))) throw new Error('Contract removal failed, because it still has money.');
        // delete accounts[address];
        // type: 'removed'
        accounts[address] = emptyAccount(address);
        accounts[address].empty = false;
        // we need this for comparing persistence changes; do better
        accounts[address].removed = true;
    }

    const updateBalance = (address, total) => {
        if (!accounts[address]) accounts[address] = emptyAccount(address);
        accounts[address].balance = toBN(total);
        accounts[address].empty = false;
    }

    const setBulk = (accounts = {}) => {
        Object.keys(accounts).forEach(addr => {
            set(cloneContract(accounts[addr]));
        })
    }

    return {
        get,
        set,
        updateBalance,
        remove,
        setBulk,
    }
}

const blocks = (blocks = []) => {
    let count = 0;
    const blocksByHash = {};

    blocks.forEach(block => {
        blocksByHash[block.hash] = block.number;
        count = block.number + 1;
    });

    const set = () => {
        const block = {
            number: count,
            timestamp: (new Date()).getTime(),
            // mock
            hash: randomHash(),
            difficulty: 2307651677621404,
            gasLimit: 30000000,
            coinbase: '0x'.padEnd(42, '0'), // randomAddress(),
        }
        blocks.push(block);
        blocksByHash[block.hash] = count;
        count ++;

        return block;
    }

    const get = tag => {
        if (parseInt(tag) === tag) return blocks[tag];
        return blocks[count - 1];
    }

    return {
        get,
        set,
    }
}

const logs = (logs = []) => {
    const logsByBlockNumber = {};
    logs.forEach(log => {
        if(!logsByBlockNumber[log.blockNumber]) logsByBlockNumber[log.blockNumber] = [];
        logsByBlockNumber[log.blockNumber].push(log);
    });

    const set = (log) => {
        logs.push(log);
        if (!logsByBlockNumber[log.blockNumber]) {
            logsByBlockNumber[log.blockNumber] = [];
        }
        logsByBlockNumber[log.blockNumber].push(log);
    }

    const getBlockLogs = number => logsByBlockNumber[number];
    const getLogs = () => logs;
    const setBulk = (logs = []) => {
        logs.forEach(set);
    }

    return { set, getBlockLogs, getLogs, setBulk };
}

const cloneStorage = storage => {
    if (!storage) return {};
    const clonedStorage = {};
    Object.keys(storage).forEach(key => {
        clonedStorage[key] = hexToUint8Array(uint8ArrayToHex(storage[key]));
    });
    return clonedStorage;
}

const cloneContract = obj => {
    return {
        ...obj,
        balance: obj.balance.clone(),
        storage: cloneStorage(obj.storage),
    }
}

const cloneContext = (context = {}) => {
    const newcontext = {};
    Object.keys(context).forEach(addr => {
        newcontext[addr] = cloneContract(context[addr]);
    });
    return newcontext;
}

const cloneLog = log => {
    const {address, blockNumber, data, topics} = log;
    return {address, blockNumber, data: hexToUint8Array(uint8ArrayToHex(data)), topics: [...topics]}
}
const cloneLogs = logs => logs.map(cloneLog);

module.exports = { persistence: persistenceMock, blocks, logs, cloneContext, cloneLogs, cloneStorage, cloneContract };
