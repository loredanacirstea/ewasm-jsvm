const { randomHash, randomAddress } = require('./utils.js');

const persistenceMock = () => {
    const accounts = {};

    const get = address => accounts[address];

    const set = ({ address, runtimeCode, balance = 0 }) => {
        // pathToWasm ?
        address = address || randomAddress();
        if (accounts[address]) throw new Error('Address already exists');
        runtimeCode = runtimeCode || new Uint8Array(0);
        accounts[address] = { runtimeCode, balance };
        return address;
    }

    const remove = address => {
        if (accounts[address].balance > 0) throw new Error('Contract removal failed, because it still has money.');
        delete accounts[address];
    }

    const updateBalance = (address, total) => {
        accounts[address].balance = total;
    }

    return {
        get,
        set,
        updateBalance,
        remove,
    }
}

const blocks = () => {
    let count = 0;
    const blocks = [];
    const blocksByHash = {};
    
    const set = () => {
        const block = {
            number: count,
            timestamp: (new Date()).getTime(),
            // mock
            hash: randomHash(),
            difficulty: 2307651677621404,
            gasLimit: 8000000,
            coinbase: randomAddress(),
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

const logs = () => {
    const logs = [];
    const logsByBlockNumber = {};

    const set = (log) => {
        logs.push(log);
        if (!logsByBlockNumber[log.blockNumber]) {
            logsByBlockNumber[log.blockNumber] = [];
        }
        logsByBlockNumber[log.blockNumber].push(log);
    }

    const getBlockLogs = number => logsByBlockNumber[number];
    const getLogs = () => logs;
    return { set, getBlockLogs, getLogs };
}

module.exports = { persistence: persistenceMock, blocks, logs };