const { ethers } = require('ethers');
const { compileContracts } = require('./setup/setup');
const { ewasmjsvm: _ewasmjsvm, evmjs: _evmjs } = require('../src/index.js');
const utils = require('../src/utils.js');
const { uint8ArrayToHex, strip0x } = require('../src/utils.js');
const {Logger} = require('../src/config');

const ewasmjsvm = _ewasmjsvm();
const evmjs = _evmjs();
const jsvms = {evmjs, ewasmjsvm};
const checksum = ethers.utils.getAddress;
const {toBN} = utils;

const DEFAULT_TX_INFO = {
    gasLimit: 1000000,
    gasPrice: 10,
    from: '0x79f379cebbd362c99af2765d1fa541415aa78508',
    value: 0,
}

const accounts = [
    {
        address: '0x79f379cebbd362c99af2765d1fa541415aa78508',
        balance: 400000000000000,
    },
    {
        address: '0xD32298893dD95c1Aaed8A79bc06018b8C265a279',
        balance: 900000000000,
    }
]

// const exampleArr = [...new Array(count)].map(() => '0x' + [...new Array(size)].map((_, i) => (i+1).toString(16).padStart(2, '0')).join(''))


it('test utils', async function () {
    let a;
    a = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    expect(utils.uint8ArrayToHex(utils.hexToUint8Array(a))).toBe(a);

    a = '0x04Ca854d2003eC7D7f977F947a4935733D2A8181';
    expect(utils.uint8ArrayToHex(utils.hexToUint8Array(a))).toBe(a.toLowerCase());
});

it('test gascost 1', async function () {
    const runtime = await evmjs.runtimeSim('6010600401', []);
    await runtime.mainRaw({...DEFAULT_TX_INFO});
    expect(runtime.gas.used.toNumber()).toBe(9);
});

describe.each([
    ['ewasmjsvm', 'bin'],
    ['evmjs', 'evm'],
])('testsuite: %s', (name, field) => {
    let contracts;
    const deployments = {};
    const jsvm = jsvms[name];
    const itevmjs = name === 'evmjs' ? it : it.skip;

    beforeAll(async () => {
        contracts = await compileContracts();

        // Assign balances to accounts
        accounts.forEach(account => {
            account.address = account.address.toLowerCase();
            ewasmjsvm.getPersistence().set(account);

            const entry = ewasmjsvm.getPersistence().get(account.address);
            expect(entry.balance.toNumber()).toBe(account.balance);


            evmjs.getPersistence().set(account);
            const entry2 = evmjs.getPersistence().get(account.address);
            expect(entry2.balance.toNumber()).toBe(account.balance);
        });

        return;
    }, 20000);

    it('test c1 - simple fallback, just constructor', async function () {
        const runtime = await jsvm.runtimeSim(contracts.c1[field], contracts.c1.abi);
        deployments.c1 = runtime;
        const answ = await runtime.main({...DEFAULT_TX_INFO});
        expect(answ.val._hex).toBe('0xeeeeeeeeeeeeee');
    });

    it('test c2, simple fallback with constructor', async function () {
        const runtime = await jsvm.deploy(contracts.c2[field], contracts.c2.abi)({...DEFAULT_TX_INFO});
        deployments.c2 = runtime;
        const answ = await runtime.main({...DEFAULT_TX_INFO});
        expect(answ.val.toNumber()).toBe(999999);
    });

    itevmjs('test gascost 2', async function () {
        const runtime = await jsvm.deploy(contracts.Metering[field], contracts.Metering.abi)({...DEFAULT_TX_INFO});
        const answ = await runtime.mainRaw({...DEFAULT_TX_INFO});
        expect(uint8ArrayToHex(answ)).toBe('0x00000000000000000000000000000000000000000000000000eeeeeeeeeeeeee');
        // console.log(runtime.logs.map(v => `${v.name} - ${v.gasCost}`).join('\n'));
        // expect(runtime.gas.used.toNumber()).toBe(57);
    });

    it('test c3 multiple opcodes', async function () {
        const tx_info = {...DEFAULT_TX_INFO, value: 1400};
        let fromBalance = jsvm.getPersistence().get(tx_info.from).balance;
        const runtime = await jsvm.deploy(contracts.c3[field], contracts.c3.abi)(tx_info);
        deployments.c3 = runtime;
        fromBalance = fromBalance.sub(toBN(tx_info.value));
        expect(jsvm.getPersistence().get(tx_info.from).balance.toString()).toBe(fromBalance.toString());
        expect(jsvm.getPersistence().get(runtime.address).balance.toString()).toBe(tx_info.value.toString());

        const address2 = deployments.c2.address;
        const answ = await runtime.main(address2, accounts[0].address, tx_info);
        const block = jsvm.getBlock('latest');

        expect(answ.addr).toBe(checksum(runtime.address));
        expect(answ.caller).toBe(checksum(tx_info.from));
        // TODO
        // expect(answ.addr_balance).toBe(accounts[0].balance);
        expect(answ.callvalue).toBe(tx_info.value);
        expect(answ.calldatasize).toBe(64);
        expect(answ.origin).toBe(checksum(tx_info.from));
        expect(answ.difficulty.toNumber()).toBe(block.difficulty);
        expect(answ.stored_addr).toBe(checksum(runtime.address));
        expect(answ.gas_left.toNumber()).toBe(998392);
        expect(answ.blockhash).toBe(block.hash);
        // expect(answ.gaslimit.toNumber()).toBe(30000000); // ewasm 1000000
        expect(answ.gasprice.toNumber()).toBe(tx_info.gasPrice);
        expect(answ.number.toNumber()).toBe(block.number);
        expect(answ.timestamp.toNumber()).toBe(block.timestamp);
        expect(answ.coinbase).toBe(checksum(block.coinbase));
        expect(answ.codesize.toNumber()).toBe(runtime.bin.length);
        expect(answ.calldata).toBe(checksum(address2));
        expect(answ.extcodesize.toNumber()).toBe(deployments.c2.bin.length);
        expect(answ.extcodecopy).toBe(utils.uint8ArrayToHex(deployments.c2.bin.slice(0, 32)).padEnd(66, '0'));
    });

    it('test c4 revert', async function () {
        const runtime = await jsvm.deploy(contracts.c4[field], contracts.c4.abi)(DEFAULT_TX_INFO);
        deployments.c4 = runtime;

        await expect(() => {
            return runtime.main(DEFAULT_TX_INFO);
        }).rejects.toThrow(/Revert: 0x00000000000000000000000000000000000000000000000000eeeeeeeeeeeeee/);
    });

    itevmjs('test c5 logs', async function () {
        const runtime = await jsvm.deploy(contracts.c5[field], contracts.c5.abi)(DEFAULT_TX_INFO);
        deployments.c5 = runtime;
        await runtime.main(DEFAULT_TX_INFO);

        const block = jsvm.getBlock('latest');
        const logs = jsvm.getLogs().getBlockLogs(block.number);

        logs.forEach(log => {
            const data = utils.decode([{type: 'uint', name: 'data'}], log.data).data;
            expect(log.blockNumber).toBe(block.number);
            expect(data.toNumber()).toBe(777777);
        });
        expect(logs[0].topics.length).toBe(0);
        expect(logs[1].topics.length).toBe(1);
        expect(logs[2].topics.length).toBe(2);
        expect(logs[3].topics.length).toBe(3);
        expect(logs[4].topics.length).toBe(4);

        expect(logs[1].topics[0].toNumber()).toBe(55555555);

        expect(logs[2].topics[0].toNumber()).toBe(55555554);
        expect(logs[2].topics[1].toNumber()).toBe(55555553);

        expect(logs[3].topics[0].toNumber()).toBe(55555552);
        expect(logs[3].topics[1].toNumber()).toBe(55555551);
        expect(logs[3].topics[2].toNumber()).toBe(55555550);

        expect(logs[4].topics[0].toNumber()).toBe(55555549);
        expect(logs[4].topics[1].toNumber()).toBe(55555548);
        expect(logs[4].topics[2].toNumber()).toBe(55555547);
        expect(logs[4].topics[3].toNumber()).toBe(55555546);
    });

    it.skip('test c6 getExternalBalance', async function () {
        const runtime = await jsvm.deploy(contracts.c6[field], contracts.c6.abi)(DEFAULT_TX_INFO);
        deployments.c6 = runtime;

        const answ = await runtime.main(accounts[0].address, DEFAULT_TX_INFO);
        expect(answ.balance).toBe(jsvm.getPersistence().get(accounts[0].address).balance.toNumber());
    });

    it('test c7 - create', async function () {
        const tx_info = {...DEFAULT_TX_INFO, value: 1400};
        const runtime = await jsvm.deploy(contracts.c7[field], contracts.c7.abi)(DEFAULT_TX_INFO);
        deployments.c7 = runtime;
        let { addr } = await runtime.main(tx_info);
        addr = addr.toLowerCase();

        const createdContract = jsvm.getPersistence().get(addr);
        expect(createdContract.balance.toString()).toBe(tx_info.value.toString());
        expect(createdContract.runtimeCode).not.toBeNull();

        const cinstance = await jsvm.runtimeSim(createdContract.runtimeCode, [contracts.c2.abi[1]], addr);
        const answ = await cinstance.main(DEFAULT_TX_INFO);
        expect(answ.val.toNumber()).toBe(999999);
    });

    it('test c7b - create from calldata', async function () {
        const tx_info = {...DEFAULT_TX_INFO, value: 1400};
        const runtime = await jsvm.deploy(contracts.c7b[field], contracts.c7b.abi)(DEFAULT_TX_INFO);
        tx_info.data = '0x' + contracts.c1[field];

        let { addr } = await runtime.mainRaw(tx_info);
        addr = addr.toLowerCase();

        const createdContract = jsvm.getPersistence().get(addr);
        expect(createdContract.balance.toString()).toBe(tx_info.value.toString());
        expect(createdContract.runtimeCode).not.toBeNull();

        const cinstance = await jsvm.runtimeSim(createdContract.runtimeCode, [contracts.c2.abi[1]])
        const answ = await cinstance.main(DEFAULT_TX_INFO);
        expect(answ.val._hex).toBe('0xeeeeeeeeeeeeee');
    });

    it('test c8 selfDestruct', async function () {
        const tx_info = {...DEFAULT_TX_INFO, value: 800000};
        let fromBalance = jsvm.getPersistence().get(tx_info.from).balance;

        const runtime = await jsvm.deploy(contracts.c8[field], contracts.c8.abi)(tx_info);
        deployments.c8 = runtime;

        fromBalance = fromBalance.sub(toBN(tx_info.value));
        expect(jsvm.getPersistence().get(tx_info.from).balance.toString()).toBe(fromBalance.toString());
        expect(jsvm.getPersistence().get(runtime.address).balance.toString()).toBe(tx_info.value.toString());
        expect(uint8ArrayToHex(jsvm.getPersistence().get(runtime.address).runtimeCode)).toBe(uint8ArrayToHex(runtime.bin));

        await runtime.main(DEFAULT_TX_INFO);

        fromBalance = fromBalance.add(toBN(tx_info.value));
        expect(jsvm.getPersistence().get(tx_info.from).balance.toString()).toBe(fromBalance.toString());
        expect(jsvm.getPersistence().get(runtime.address).balance.toString()).toBe('0');
        expect(jsvm.getPersistence().get(runtime.address).runtimeCode).toBeUndefined();
    });

    const itnested = name === 'evmjs' ? it : it.skip;
    itnested('test c9 calls', async function () {
        const runtime = await jsvm.deploy(contracts.c9[field], contracts.c9.abi)(DEFAULT_TX_INFO);
        deployments.c9 = runtime;

        const runtime_ = await jsvm.deploy(contracts.c9_[field], contracts.c9_.abi)(DEFAULT_TX_INFO);
        deployments.c9_ = runtime_;

        const answ = await runtime.main(deployments.c9_.address, deployments.c2.address, DEFAULT_TX_INFO);
        expect(answ[0]).toBe('0x00000000000000000000000000000000000000000000000000000000000f424900000000000000000000000000000000000000000000000000000000000f4249');
    });

    it('test c10 - simple functions', async function () {
        const runtime = await jsvm.deploy(contracts.c10[field], contracts.c10.abi)(DEFAULT_TX_INFO);
        deployments.c10 = runtime;

        let answ = await runtime.sum(8, 2, DEFAULT_TX_INFO);
        expect(answ.c.toNumber()).toBe(10);

        answ = await runtime.testAddress(runtime.address, DEFAULT_TX_INFO);
        expect(answ[0].toLowerCase()).toBe(runtime.address);

        let value = (await runtime.value(DEFAULT_TX_INFO))[0].toNumber();
        expect(value).toBe(5);

        let balance = jsvm.getPersistence().get(runtime.address).balance.toNumber();

        const newvalue = await runtime.addvalue(10, {...DEFAULT_TX_INFO, value: 40});
        value += 50;
        expect(newvalue[0].toNumber()).toBe(value);

        const val = (await runtime.value(DEFAULT_TX_INFO))[0].toNumber();
        expect(val).toBe(value);

        const newbalance = jsvm.getPersistence().get(runtime.address).balance.toNumber();
        balance += 40;
        expect(newbalance).toBe(balance);
    }, 5000);

    it('test c10 - callStatic, call', async function () {
        const runtime = await jsvm.deploy(contracts.c10[field], contracts.c10.abi)(DEFAULT_TX_INFO);
        deployments.c10 = runtime;

        const _runtime = await jsvm.deploy(contracts.c12[field], contracts.c12.abi)(DEFAULT_TX_INFO);

        let value = (await deployments.c10.value({...DEFAULT_TX_INFO}))[0].toNumber();
        let balance = jsvm.getPersistence().get(deployments.c10.address).balance.toNumber();

        answ = await _runtime.test_staticcall(deployments.c10.address, 8, 2, DEFAULT_TX_INFO);
        expect(answ.c.toNumber()).toBe(10);
        expect(jsvm.getPersistence().get(deployments.c10.address).balance.toNumber()).toBe(balance);

        answ = await _runtime.test_staticcall_address(deployments.c10.address, deployments.c10.address, DEFAULT_TX_INFO);
        expect(eBN2addr(answ.c)).toBe(deployments.c10.address);
        expect(jsvm.getPersistence().get(deployments.c10.address).balance.toNumber()).toBe(balance);

        await _runtime.test_call(deployments.c10.address, 10, {...DEFAULT_TX_INFO, value: 40});
        const val2 = (await deployments.c10.value({...DEFAULT_TX_INFO}))[0].toNumber();
        expect(val2).toBe(value + 10 + 40);
        // expect(jsvm.getPersistence().get(runtime.address).balance.toNumber()).toBe(balance + 40);
        // expect(jsvm.getPersistence().get(_runtime.address).balance.toNumber()).toBe(0);
    }, 15000);

    it('test c10 revert', async function () {
        const runtime = await jsvm.deploy(contracts.c10[field], contracts.c10.abi)({...DEFAULT_TX_INFO});
        let value = (await runtime.value({...DEFAULT_TX_INFO}))[0].toNumber();
        let balance = jsvm.getPersistence().get(runtime.address).balance.toNumber();

        await expect(runtime._revert({...DEFAULT_TX_INFO, value: 40})).rejects.toThrow();

        const val = (await runtime.value({...DEFAULT_TX_INFO}))[0].toNumber();
        expect(val).toBe(value);

        const newbalance = jsvm.getPersistence().get(runtime.address).balance.toNumber();
        expect(newbalance).toBe(balance);
    });

    it('test c11 - for loop', async function () {
        const runtime = await jsvm.deploy(contracts.c11[field], contracts.c2.abi)(DEFAULT_TX_INFO);
        let answ = await runtime.main( DEFAULT_TX_INFO);
        expect(answ.val.toNumber()).toBe(11);
    });

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

function eBN2addr (n) {
    return '0x' + strip0x(n.toHexString()).padStart(40, '0');
}
