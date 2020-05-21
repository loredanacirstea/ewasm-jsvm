const fs = require('fs');
const { exec } = require("child_process");
const ewasmjsvm = require('../src/index.js');
const utils = require('../src/utils.js');

const C_PATH = './tests/contracts';
const SOL_PATH = './tests/sol';
const B_PATH = './tests/build';
const solToYul = name => `solc --ir -o ${C_PATH} ${SOL_PATH}/${name}.sol --overwrite`;
const yulToEwasm = name => `solc --strict-assembly --optimize --yul-dialect evm --machine ewasm ${C_PATH}/${name}.yul`;
// const yulToEwasm = name => `solc --strict-assembly --yul-dialect evm --machine ewasm ${C_PATH}/${name}.yul`;
const watToWasm = name => `wat2wasm build_wat/${name}.wat -o build_wasm/${name}.wasm`;

const c1Abi = [
    { name: 'main', type: 'fallback', inputs: [], outputs: [{ name: 'val', type: 'uint32' }]},
]

const c2Abi = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [], outputs: [{ name: 'val', type: 'uint32' }]},
]

let c3Abi = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [
        { name: 'addr', type: 'address' },
        { name: 'account', type: 'address' },
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
    { name: 'main', type: 'fallback', inputs: [], outputs: [{ name: 'val', type: 'uint32' }]},
]

const c5Abi = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [], outputs: []},
]

const c6Abi = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [{ name: 'addr', type: 'address' }], outputs: [{ name: 'balance', type: 'uint' }]},
]

const c7Abi = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [], outputs: [{ name: 'addr', type: 'address' }]},
]

const c7bAbi = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [{ name: 'calldata', type: 'bytes' }], outputs: [{ name: 'addr', type: 'address' }]},
]

const c8Abi = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [], outputs: []},
]

const c9Abi = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [{ name: 'addr', type: 'address'}], outputs: [{ name: 'val', type: 'uint' }]},
]

const c10Abi = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'sum', type: 'function', inputs: [{ name: 'a', type: 'uint256'}, { name: 'b', type: 'uint256'}], outputs: [{ name: 'c', type: 'uint256'}]},
    { name: 'double', type: 'function', inputs: [{ name: 'a', type: 'uint256'}], outputs: [{ name: 'b', type: 'uint256'}]},
]

const taylorAbi = [
    { name: 'constructor', type: 'constructor', inputs: [], outputs: []},
    { name: 'main', type: 'fallback', inputs: [{ name: 'data', type: 'bytes'}], outputs: [{ name: 'result', type: 'bytes' }]},
]

const DEFAULT_TX_INFO = {
    gasLimit: 1000000,
    gasPrice: 10,
    from: '0x79f379cebbd362c99af2765d1fa541415aa78508',
    value: 0,
}

const contracts = {};
const deployments = {};
const accounts = [
    {
        address: '0x79f379cebbd362c99af2765d1fa541415aa78508',
        balance: 400000000,
    },
    {
        address: '0xD32298893dD95c1Aaed8A79bc06018b8C265a279',
        balance: 900000,
    }
]

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

const compileSol = name => new Promise((resolve, reject) => {
    const command = solToYul(name);
    console.log('Running command: ', command);
    exec(command, async (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            reject(error);
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
        }
        // The .yul file has been created
        resolve();
    });
});

beforeAll(async () => {
    // Compile contracts
    let sol_names = await promisify(fs.readdir, SOL_PATH).catch(console.log);
    sol_names = sol_names.map(name => name.replace('.sol', ''));
    for (name of sol_names) {
        await compileSol(name);
    }

    let names = await promisify(fs.readdir, C_PATH).catch(console.log);
    names = names.map(name => name.replace('.yul', ''));
    names = names.filter(n => n !== 'taylor');  // takes too much time
    // names = ['c11', 'c12']

    for (name of names) {
        contracts[name] = await compile(name);
        createBuild(name, contracts[name]);
    }

    // Assign balances to accounts
    accounts.forEach(account => {
        account.address = account.address.toLowerCase();
        ewasmjsvm.getPersistence().set(account);

        const entry = ewasmjsvm.getPersistence().get(account.address);
        expect(entry.balance).toBe(account.balance);
    });
    
    return;
}, 20000);

it('test utils', async function () {
    let a;
    a = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    expect('0x' + utils.uint8ArrayToHex(utils.hexToUint8Array(a))).toBe(a);
    
    a = '0x04Ca854d2003eC7D7f977F947a4935733D2A8181';
    expect('0x' + utils.uint8ArrayToHex(utils.hexToUint8Array(a))).toBe(a.toLowerCase());
});

it('test c1', async function () {
    const ewmodule = await ewasmjsvm.runtimeSim(contracts.c1.bin, c1Abi);
    deployments.c1 = ewmodule;
    const answ = await ewmodule.main(DEFAULT_TX_INFO);
    expect(answ.val).toBe(0xeeeeeeeeeeeeee);
});

it('test c2', async function () {
    const runtime = await ewasmjsvm.deploy(contracts.c2.bin, c2Abi)(DEFAULT_TX_INFO);
    deployments.c2 = runtime;
    const answ = await runtime.main(DEFAULT_TX_INFO);
    expect(answ.val).toBe(999999);
});

it('test c3 multi', async function () {
    const tx_info = {...DEFAULT_TX_INFO, value: 1400};
    let fromBalance = ewasmjsvm.getPersistence().get(tx_info.from).balance;
    
    const runtime = await ewasmjsvm.deploy(contracts.c3.bin, c3Abi)(tx_info);
    deployments.c3 = runtime;
    const address2 = deployments.c2.address;
    
    fromBalance -= tx_info.value;
    expect(ewasmjsvm.getPersistence().get(tx_info.from).balance).toBe(fromBalance);
    expect(ewasmjsvm.getPersistence().get(runtime.address).balance).toBe(tx_info.value);
    
    const answ = await runtime.main(address2, accounts[0].address, tx_info);
    const block = ewasmjsvm.getBlock('latest');

    expect(answ.addr).toBe(runtime.address);
    expect(answ.caller).toBe(tx_info.from);
    // TODO
    // expect(answ.addr_balance).toBe(accounts[0].balance);
    expect(answ.callvalue).toBe(tx_info.value);
    expect(answ.calldatasize).toBe(64);
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

it('test c4 revert', async function () {
    const runtime = await ewasmjsvm.deploy(contracts.c4.bin, c4Abi)(DEFAULT_TX_INFO);
    deployments.c4 = runtime;

    await expect(() => {
        return runtime.main(DEFAULT_TX_INFO);
    }).rejects.toThrow(/Revert: 00000000000000000000000000000000000000000000000000eeeeeeeeeeeeee/);
});

it('test c5 logs', async function () {
    const runtime = await ewasmjsvm.deploy(contracts.c5.bin, c5Abi)(DEFAULT_TX_INFO);
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

it('test c6 getExternalBalance', async function () {
    const runtime = await ewasmjsvm.deploy(contracts.c6.bin, c6Abi)(DEFAULT_TX_INFO);
    deployments.c6 = runtime;

    // TODO
    // expect(
    //     ewasmjsvm.getPersistence().get(accounts[0].address).balance
    // ).toBe(accounts[0].balance);
    
    const answ = await runtime.main(accounts[0].address, DEFAULT_TX_INFO);
    // expect(answ.balance).toBe(accounts[0].balance);
});

it('test c7 - create', async function () {
    const tx_info = {...DEFAULT_TX_INFO, value: 1400};
    const runtime = await ewasmjsvm.deploy(contracts.c7.bin, c7Abi)(DEFAULT_TX_INFO);
    deployments.c7 = runtime;
    const { addr } = await runtime.main(tx_info);

    const createdContract = ewasmjsvm.getPersistence().get(addr);
    expect(createdContract.balance).toBe(tx_info.value);
    expect(createdContract.runtimeCode).not.toBeNull();

    const cinstance = await ewasmjsvm.runtimeSim(createdContract.runtimeCode, [c2Abi[1]], addr);
    const answ = await cinstance.main(DEFAULT_TX_INFO);
    expect(answ.val).toBe(999999);
});

it('test c7b - create from calldata', async function () {
    const tx_info = {...DEFAULT_TX_INFO, value: 1400};
    const runtime = await ewasmjsvm.deploy(contracts.c7b.bin, c7bAbi)(DEFAULT_TX_INFO);
    const calldata = contracts.c1.bin;
    const { addr } = await runtime.main(calldata, tx_info);

    const createdContract = ewasmjsvm.getPersistence().get(addr);
    expect(createdContract.balance).toBe(tx_info.value);
    expect(createdContract.runtimeCode).not.toBeNull();

    const cinstance = await ewasmjsvm.runtimeSim(createdContract.runtimeCode, [c2Abi[1]])
    const answ = await cinstance.main(DEFAULT_TX_INFO);
    expect(answ.val).toBe(0xeeeeeeeeeeeeee);
});

it('test c8 selfDestruct', async function () {
    const tx_info = {...DEFAULT_TX_INFO, value: 800000};
    let fromBalance = ewasmjsvm.getPersistence().get(tx_info.from).balance;
    
    const runtime = await ewasmjsvm.deploy(contracts.c8.bin, c8Abi)(tx_info);
    deployments.c8 = runtime;

    fromBalance -= tx_info.value;
    expect(ewasmjsvm.getPersistence().get(tx_info.from).balance).toBe(fromBalance);
    expect(ewasmjsvm.getPersistence().get(runtime.address).balance).toBe(tx_info.value);
    
    await runtime.main(DEFAULT_TX_INFO);

    fromBalance += tx_info.value;
    expect(ewasmjsvm.getPersistence().get(tx_info.from).balance).toBe(fromBalance);
    expect(ewasmjsvm.getPersistence().get(runtime.address)).toBeUndefined();
});

it.skip('test c9 calls', async function () {
    const runtime = await ewasmjsvm.deploy(contracts.c9.bin, c9Abi)(DEFAULT_TX_INFO);
    deployments.c9 = runtime;

    const calldata = deployments.c2.address;
    const answ = await runtime.main(calldata, DEFAULT_TX_INFO);
    expect(answ.val).toBe(1);
});

it('test c10', async function () {
    const runtime = await ewasmjsvm.deploy(contracts.c10.bin, c10Abi)(DEFAULT_TX_INFO);
    let answ = await runtime.sum('0x08', '0x02', DEFAULT_TX_INFO);
    expect(answ.c).toBe(10);

    answ = await runtime.double('0x08', DEFAULT_TX_INFO);
    expect(answ.b).toBe(16);
});

it.skip('test taylor', async function () {
    let answ, data;
    const taylor = await ewasmjsvm.deploy(contracts.taylor.bin, taylorAbi)(DEFAULT_TX_INFO);

    // TODO: waiting for keccak implementation
    // Store uint
    // data = '0xfffffffe0000000511000000030000000dee0000010000000522000001110000001d3333333800000000333333350000000200023333333000000003010003';
    // answ = await taylor.main(data, DEFAULT_TX_INFO);
    // console.log('answ', answ)
    
    // // Get uint
    // data = '0xfffffffd11000000';
    // answ = await taylor.main(data, DEFAULT_TX_INFO);
    // expect(resp).toBe('0x0000000511000000030000000dee0000010000000522000001110000001d3333333800000000333333350000000200023333333000000003010003');

    // // Instantiate uint
    // data = '0xffffffff11000008';
    // answ = await taylor.main(data, DEFAULT_TX_INFO);
    // expect(resp).toBe('0xee0000010000000c110000080000000000000000');

    // curry
    // data = '0xfffffffaee0000040000000800000010000000150000002622000004333333302200000422000004220000014444000003110000030000030000020000050000000566000000020000000000000015333333280000000300010233333332000000020403';
    // answ = await taylor.main(data, DEFAULT_TX_INFO);
    // expect(answ.result).toBe('0xee000001000000144400000322000004440000034400000244000005');
    
    // reduce
    // data = '0xffffffff33333331ee00000300000008000000160000001d2200000433333333440000021100000300000200000511000003000001';
    // answ = await taylor.main(data, DEFAULT_TX_INFO);
    // console.log(answ)
    // expect(answ.result).toBe('0xee000001000000071100000300000a');

    // initialize uint
    // data = '0xfffffffaee00000100000007110000030000040000000511000000030000000dee0000010000000522000001110000001d3333333800000000333333350000000200023333333000000003010003';
    // answ = await taylor.main(data, DEFAULT_TX_INFO);
    // console.log(answ)
    // expect(answ.result).toBe('0xee000001000000081100000400000000');
});

it.skip('test c11', async function () {
    const runtime = await ewasmjsvm.deploy(contracts.c11.bin, c2Abi)(DEFAULT_TX_INFO);
    let answ = await runtime.main( DEFAULT_TX_INFO);
    expect(answ.val).toBe(11);
});

it.skip('test c12', async function () {
    const ewmodule = await ewasmjsvm.runtimeSim(contracts.c12.bin, c1Abi);
    const answ = await ewmodule.main(DEFAULT_TX_INFO);
    expect(answ.val).toBe(11);
});

const postIndex = (str, marker) => {
    const index = str.indexOf(marker);
    return {
        pre: index - 1,
        post: index + marker.length + 1,
    }
}

function parseCompilerOutput(str) {
    const bin = str.match(/Binary representation:\n(.*)\n/)[1];
    const watm = str.match(/Text representation:\n((.*\n*)*)/);
    const wat = watm[1];

    const prettyIndex = postIndex(str, 'Pretty printed source:');
    const yulWasmIndex = postIndex(str, 'Translated source:');
    const binaryIndex = postIndex(str, 'Binary representation:');

    const optimized = str.substring(prettyIndex.post, yulWasmIndex.pre);
    const yul_wasm = str.substring(yulWasmIndex.post, binaryIndex.pre);
    return {optimized, yul_wasm, bin, wat};
}

async function createBuild(name, { bin, optimized, yul_wasm, wat}) {
    const basePath = B_PATH + '/' + name + '_';

    await promisify(fs.writeFile, basePath + 'bin', bin).catch(console.log);
    await promisify(fs.writeFile, basePath + 'wat.wat', wat).catch(console.log);
    await promisify(fs.writeFile, basePath + 'wasm.yul', yul_wasm).catch(console.log);
    await promisify(fs.writeFile, basePath + 'opt.yul', optimized).catch(console.log);
}

function promisify(func, ...args) {
    return new Promise((resolve, reject) => {
        func(...args, (error, result) => {
            if (error) reject(error);
            resolve(result);
        })
    });
}