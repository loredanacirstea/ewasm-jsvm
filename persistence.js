const randomAddress = () => {
    // hex values
    let allowed = [...Array(6).keys()].map(i => i + 97)
        .concat([...Array(10).keys()].map(i => i + 48));
    return '0x' + [...Array(40).keys()]
        .map(i => Math.floor(Math.random() * 16))
        .map(index => String.fromCharCode(allowed[index]))
        .join('');
}

const persistence = () => {
    const contracts = {};

    const get = address => contracts[address];

    const set = (runtimeCode ) => {
        // pathToWasm ?
        const address = randomAddress();
        contracts[address] = { runtimeCode };
        return address;
    }

    return {
        get,
        set,
    }
}

module.exports = persistence;