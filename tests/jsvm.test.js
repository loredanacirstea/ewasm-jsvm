const fs = require('fs');
const { exec } = require("child_process");
const solc = require('solc');
const assert = require('assert');
const ewasmjsvm = require('../src/index.js');
const utils = require('../src/utils.js');

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
    { name: 'main', type: 'function', inputs: [
        { name: 'addr', type: 'address' },
    ], outputs: [
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
        { name: 'coinbase', type: 'address' },
        { name: 'codesize', type: 'uint' },
        { name: 'calldata', type: 'address' },
        { name: 'extcodesize', type: 'uint' },
        { name: 'extcodecopy', type: 'bytes32' },
    ]},
]

const c4Abi = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'function', inputs: [], outputs: [{ name: 'val', type: 'uint32' }]},
]

const c5Abi = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'function', inputs: [], outputs: []},
]

const DEFAULT_TX_INFO = {
    gasLimit: 1000000,
    gasPrice: 10,
    from: '0x79f379cebbd362c99af2765d1fa541415aa78509',
    value: 0,
}

const contracts = {};
const deployments = {};

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
    const names = ['c1', 'c2', 'c3', 'c4', 'c5'];
    for (name of names) {
        contracts[name] = await compile(name);
    }
    return;
});

it('test utils', async function () {
    let a;
    a = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    expect('0x' + utils.uint8ArrayToHex(utils.hexToUint8Array(a))).toBe(a);
    
    a = '0x04Ca854d2003eC7D7f977F947a4935733D2A8181';
    expect('0x' + utils.uint8ArrayToHex(utils.hexToUint8Array(a))).toBe(a.toLowerCase());
});

it('test c1', async function () {
    const ewmodule = ewasmjsvm.initialize(contracts.c1.bin, c1Abi);
    deployments.c1 = ewmodule;
    const answ = await ewmodule.main(DEFAULT_TX_INFO);
    expect(answ.val).toBe(999999);
});

it('test c2', async function () {
    const ewmodule = ewasmjsvm.initialize(contracts.c2.bin, c2Abi);
    const runtime = await ewmodule.main(DEFAULT_TX_INFO);
    deployments.c2 = runtime;
    const answ = await runtime.main(DEFAULT_TX_INFO);
    expect(answ.val).toBe(999999);
});

it('test c3', async function () {
    const tx_info = {...DEFAULT_TX_INFO, value: 1400};
    const ewmodule = ewasmjsvm.initialize(contracts.c3.bin, c3Abi);
    deployments.c3 = ewmodule;
    const address2 = deployments.c2.address;
    const runtime = await ewmodule.main(tx_info);
    const answ = await runtime.main(address2, tx_info);
    const block = ewasmjsvm.getBlock('latest');
    expect(answ.addr).toBe(runtime.address);
    expect(answ.caller).toBe(tx_info.from);
    // expect(answ.addr_balance).toBe(22);
    expect(answ.callvalue).toBe(tx_info.value);
    expect(answ.calldatasize).toBe(32);
    expect(answ.calldata).toBe(address2);
    expect(answ.origin).toBe(tx_info.from);
    expect(answ.difficulty).toBe(block.difficulty);
    expect(answ.stored_addr).toBe(runtime.address);
    expect(answ.gas_left).toBe(tx_info.gasLimit);
    expect(answ.blockhash).toBe(block.hash);
    expect(answ.gaslimit).toBe(8000000);
    expect(answ.gasprice).toBe(tx_info.gasPrice);
    expect(answ.number).toBe(block.number);
    expect(answ.timestamp).toBe(block.timestamp);
    expect(answ.coinbase).toBe(block.coinbase);
    expect(answ.codesize).toBe(runtime.bin.length);
    expect(answ.extcodesize).toBe(deployments.c2.bin.length);
    expect(answ.extcodecopy).toBe('0x' + utils.uint8ArrayToHex(deployments.c2.bin.slice(32, 64)));
});

it('test c4', async function () {
    const ewmodule = ewasmjsvm.initialize(contracts.c4.bin, c4Abi);
    const runtime = await ewmodule.main(DEFAULT_TX_INFO);
    deployments.c4 = runtime;

    await expect(() => {
        return runtime.main(DEFAULT_TX_INFO);
    }).rejects.toThrow(/revert/i);
    // }).rejects.toThrow(/Revert: 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee/);
});

it('test c5', async function () {
    const ewmodule = ewasmjsvm.initialize(contracts.c5.bin, c5Abi);
    const runtime = await ewmodule.main(DEFAULT_TX_INFO);
    deployments.c5 = runtime;
    await runtime.main(DEFAULT_TX_INFO);

    const block = ewasmjsvm.getBlock('latest');
    const logs = ewasmjsvm.getLogs().getBlockLogs(block.number);

    logs.forEach(log => {
        expect(log.blockNumber).toBe(block.number);
        expect(utils.decode(log.data, [{type: 'uint', name: 'data'}]).data).toBe(777777);
    });
    expect(logs[0].topics.length).toBe(0);
    expect(logs[1].topics.length).toBe(1);
    expect(logs[2].topics.length).toBe(2);
    expect(logs[3].topics.length).toBe(3);
    expect(logs[4].topics.length).toBe(4);

    expect(logs[1].topics[0]).toBe(55555619);
    
    expect(logs[2].topics[0]).toBe(55555618);
    expect(logs[2].topics[1]).toBe(55555617);

    expect(logs[3].topics[0]).toBe(55555616);
    expect(logs[3].topics[1]).toBe(55555615);
    expect(logs[3].topics[2]).toBe(55555614);

    expect(logs[4].topics[0]).toBe(55555613);
    expect(logs[4].topics[1]).toBe(55555612);
    expect(logs[4].topics[2]).toBe(55555611);
    expect(logs[4].topics[3]).toBe(55555610);

    // TODO: FIXME - these values should be correct
    // expect(logs[1].topics).toBe([55555555]);
    // expect(logs[2].topics).toBe([55555554, 55555553]);
    // expect(logs[3].topics).toBe([55555552, 55555551, 55555550]);
    // expect(logs[4].topics).toBe([55555549, 55555548, 55555547, 55555546]);
});

function parseCompilerOutput(str) {
    const bin = str.match(/Binary representation:\n(.*)\n/)[1];
    return {bin};
}