const randomHex = (size) => {
    // hex values
    let allowed = [...Array(6).keys()].map(i => i + 97)
        .concat([...Array(10).keys()].map(i => i + 48));
    return '0x' + [...Array(size).keys()]
        .map(i => Math.floor(Math.random() * 16))
        .map(index => String.fromCharCode(allowed[index]))
        .join('');
}

const persistence = () => {
    const accounts = {};

    const get = address => accounts[address];

    const set = ({ address, runtimeCode, balance = 0 }) => {
        // pathToWasm ?
        address = address || randomHex(40);
        runtimeCode = runtimeCode || new Uint8Array(0);
        accounts[address] = { runtimeCode, balance };
        return address;
    }

    const updateBalance = (address, total) => {
        accounts[address].balance = total;
    }

    return {
        get,
        set,
        updateBalance,
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
            hash: randomHex(64),
            difficulty: 2307651677621404,
            gasLimit: 8000000,
            coinbase: randomHex(40),
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

module.exports = { persistence, blocks, logs };