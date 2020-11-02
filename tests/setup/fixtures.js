const c1 = [
    { name: 'main', type: 'fallback', inputs: [], outputs: [{ name: 'val', type: 'uint256' }]},
]

const c2 = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [], outputs: [{ name: 'val', type: 'uint256' }]},
]

const c3 = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [
        { name: 'addr', type: 'address' },
        { name: 'account', type: 'address' },
    ], outputs: [
        { name: 'addr', type: 'address' },
        { name: 'caller', type: 'address' },
        { name: 'addr_balance', type: 'address' }, // 16  fix
        { name: 'callvalue', type: 'uint16' },  // 16
        { name: 'calldatasize', type: 'uint8' }, // 8
        { name: 'origin', type: 'address' },  // 20
        { name: 'difficulty', type: 'uint256' }, // 32
        { name: 'stored_addr', type: 'address' }, // ?addr  fix
        { name: 'gas_left', type: 'uint256' },
        { name: 'blockhash', type: 'bytes32' }, // fix
        { name: 'gaslimit', type: 'uint' },
        { name: 'gasprice', type: 'uint' },
        { name: 'number', type: 'uint' }, // fix
        { name: 'timestamp', type: 'uint' },
        { name: 'coinbase', type: 'address' },
        { name: 'codesize', type: 'uint' },
        { name: 'calldata', type: 'address' },
        { name: 'extcodesize', type: 'uint' },
        { name: 'extcodecopy', type: 'bytes32' },
    ]},
]

const c4 = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [], outputs: [{ name: 'val', type: 'uint256' }]},
]

const c5 = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [], outputs: []},
]

const c6 = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [{ name: 'addr', type: 'address' }], outputs: [{ name: 'balance', type: 'uint' }]},
]

const c7 = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [], outputs: [{ name: 'addr', type: 'address' }]},
]

const c7b = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [{ name: 'calldata', type: 'bytes' }], outputs: [{ name: 'addr', type: 'address' }]},
]

const c8 = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [], outputs: []},
]

const c9 = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [{ name: 'addr', type: 'address'}, { name: 'addr2', type: 'address'}], outputs: [{ name: 'result', type: 'bytes'}]},
]

const c9_ = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [{ name: 'addr', type: 'address'}], outputs: [{ name: 'val', type: 'uint256' }]},
]

const c10 = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'sum', type: 'function', inputs: [{ name: 'a', type: 'uint256'}, { name: 'b', type: 'uint256'}], outputs: [{ name: 'c', type: 'uint256'}]},
    { name: 'double', type: 'function', inputs: [{ name: 'a', type: 'uint256'}], outputs: [{ name: 'b', type: 'uint256'}]},
    { name: 'value', type: 'function', inputs: [], outputs: [{ name: 'b', type: 'uint256'}]},
    { name: 'addvalue', type: 'function', inputs: [{ name: '_value', type: 'uint256'}], outputs: [{ name: 'b', type: 'uint256'}]},
    { name: '_revert', type: 'function', inputs: [], outputs: []},

    { name: 'testAddress', type: 'function', inputs: [{ name: 'addr', type: 'address'}], outputs: [{ name: 'addr', type: 'address'}]},
]

const c12 = [
    // { name: 'constructor', type: 'constructor', inputs: [{ name: '_externalc', type: 'address'}], outputs: []},
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'test_staticcall', type: 'function', inputs: [{ name: 'externalc', type: 'address'}, { name: 'a', type: 'uint256'}, { name: 'b', type: 'uint256'}], outputs: [{ name: 'c', type: 'uint256'}]},
    { name: 'test_staticcall_address', type: 'function', inputs: [{ name: 'externalc', type: 'address'}, { name: 'addr', type: 'address'}], outputs: [{ name: 'c', type: 'uint256'}]},
    { name: 'test_call', type: 'function', inputs: [{ name: 'externalc', type: 'address'}, { name: 'a', type: 'uint256'}], outputs: [{ name: 'result', type: 'uint256'}]},
]

const taylor = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [{ name: 'data', type: 'bytes'}], outputs: [{ name: 'result', type: 'bytes' }]},
]

module.exports = { c1, c2, c3, c4, c5, c6, c7, c7b, c8, c9, c9_, c10, c12 };
