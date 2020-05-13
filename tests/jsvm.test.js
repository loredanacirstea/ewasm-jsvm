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
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'function', inputs: [], outputs: [
        { name: 'addr', type: 'address' },
        { name: 'caller', type: 'address' },
        { name: 'addr_balance', type: 'uint16' }, // 16  fix
        { name: 'callvalue', type: 'uint16' },  // 16
        { name: 'calldatasize', type: 'uint8' }, // 8
        { name: 'origin', type: 'address' },  // 20
        { name: 'difficulty', type: 'uint32' }, // 32
        { name: 'stored_addr', type: 'address' }, // ?addr  fix
        { name: 'gas_left', type: 'uint' },
        { name: 'blockhash', type: 'bytes32' }, // fix
        { name: 'gaslimit', type: 'uint' },
        { name: 'gasprice', type: 'uint' },
        { name: 'number', type: 'uint' }, // fix
        { name: 'timestamp', type: 'uint' },
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

beforeAll(async () => {
    const names = ['c1', 'c2', 'c3'];
    for (name of names) {
        contracts[name] = await compile(name);
    }
    return;
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

it('test c3', async function () {
    const ewmodule = ewasmjsvm.initialize(contracts.c3.bin, c3Abi);
    const runtime = await ewmodule.main();
    const answ = await runtime.main();
    console.log('answ', answ);
    expect(answ.addr).toBe('0x79f379cebbd362c99af2765d1fa541415aa78508');
    expect(answ.caller).toBe('0x79f379cebbd362c99af2765d1fa541415aa78508');
    // expect(answ.addr_balance).toBe(22);
    expect(answ.callvalue).toBe(44);
    expect(answ.calldatasize).toBe(64);
    expect(answ.origin).toBe('0x79f379cebbd362c99af2765d1fa541415aa78508');
    expect(answ.difficulty).toBe(77);
    expect(answ.stored_addr).toBe('0x79f379cebbd362c99af2765d1fa541415aa78508');
    expect(answ.gas_left).toBe(40);
    expect(answ.blockhash).toBe(99);
    expect(answ.gaslimit).toBe(8000000);
    expect(answ.gasprice).toBe(88);
    expect(answ.number).toBe(40000);
    expect(answ.timestamp).toBe(1589188575755);
});

function parseCompilerOutput(str) {
    const bin = str.match(/Binary representation:\n(.*)\n/)[1];
    return {bin};
}