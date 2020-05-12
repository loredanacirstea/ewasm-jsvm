const fs = require('fs');
const { exec } = require("child_process");
const solc = require('solc');
const assert = require('assert');
const ewasmjsvm = require('../index.js');

const C_PATH = './tests/contracts';
const solToYul = name => `solc --ir -o ./build ${name}.sol --overwrite`;
const yulToEwasm = name => `solc --strict-assembly --optimize --yul-dialect evm --machine ewasm ${C_PATH}/${name}.yul`;
const watToWasm = name => `wat2wasm build_wat/${name}.wat -o build_wasm/${name}.wasm`;

const c1Abi = [
    { name: 'main', type: 'function', inputs: [], outputs: [{ name: 'val', type: 'uint32' }]},
]

const c2Abi = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'function', inputs: [], outputs: [{ name: 'val', type: 'uint32' }]},
]

let c3Abi = [
    { name: 'main', type: 'function', inputs: [], outputs: [
        { name: 'addr', type: 'address' },
        { name: 'caller', type: 'address' },
        { name: 'addr_balance', type: 'uint16' }, // 16
        { name: 'callvalue', type: 'uint16' },  // 16
        { name: 'calldatasize', type: 'uint8' }, // 8
        { name: 'origin', type: 'address' },  // 20
        { name: 'difficulty', type: 'uint32' }, // 32
        { name: 'stored_addr', type: 'addr' }, // ?addr
        // {name: 'blockhash', type: 'bytes32'},
        // {name: 'gas_left', type: 'uint'},
        // {name: 'gas_limit', type: 'uint'},
        // {name: 'number', type: 'uint'},
        // {name: 'timestamp', type: 'uint'},
    ]},
]


const contracts = {};

const compile = name => new Promise((resolve, reject) => {
    const command = yulToEwasm(name);
    console.log('Running command: ', command);
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            reject(error);
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            // reject(error);
        }
        resolve(parseCompilerOutput(stdout));
    });
});

beforeAll(() => {
    return compile('c1').then(c => {
        contracts['c1'] = c;
        return;
    }).then(() => compile('c2')).then(c => {
        contracts['c2'] = c;
        return;
    }).then(() => compile('c3')).then(c => {
        contracts['c3'] = c;
        return;
    })
});

it('test c1', async function () {
    const ewmodule = ewasmjsvm.initialize(contracts.c1.bin, c1Abi);
    const answ = await ewmodule.main();
    expect(answ.val).toBe(999999);
});

it('test c2', async function () {
    const ewmodule = ewasmjsvm.initialize(contracts.c2.bin, c2Abi);
    const runtime = await ewmodule.main();
    const answ = await runtime.main();
    expect(answ.val).toBe(999999);
});

function parseCompilerOutput(str) {
    const bin = str.match(/Binary representation:\n(.*)\n/)[1];
    return {bin};
}