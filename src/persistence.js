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
    const contracts = {};

    const get = address => contracts[address];

    const set = (runtimeCode) => {
        // pathToWasm ?
        const address = randomHex(40);
        contracts[address] = { runtimeCode };
        return address;
    }

    return {
        get,
        set,
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

module.exports = { persistence, blocks };