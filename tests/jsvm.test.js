const { ethers } = require('ethers');
const { compileContracts } = require('./setup/setup');
const { ewasmjsvm: _ewasmjsvm, evmjs: _evmjs } = require('../src/index.js');
const utils = require('../src/utils.js');
const { uint8ArrayToHex, hexToUint8Array, strip0x } = require('../src/utils.js');
const {Logger} = require('../src/config');
const { BASE_TX_COST } = require('../src/constants');

const { Chain, Hardfork, default: Common } = require('@ethereumjs/common');
const { Address } = require('ethereumjs-util');
const VM = require('@ethereumjs/vm').default;

const common = new Common({ chain: Chain.Mainnet, hardfork: Hardfork.Istanbul })
const othervm = new VM({ common });

async function getOtherVMResult (code, data, address, gasLimit = 3000000) {
    const steps = [];
    othervm.on('step', function (data) {
        steps.push({
            name: data.opcode.name,
            fee: data.opcode.fee,
            pc: data.pc,
            gasLeft: data.gasLeft,
            gasRefund: data.gasRefund,
            // data,
        });
    });
    const results = await othervm.runCode({
        address: address ? Address.fromString(address) : null,
        code: Buffer.from(code),
        data: Buffer.from(data),
        gasLimit: toBN(gasLimit),
    });
    return {results, steps};
}

expect.extend({
    toBeSameGasCost(cost1, [cost2, message]) {
      if (cost1 === cost2) {
        return {
          message: () => `same`,
          pass: true
        };
      } else {
        return {
          message: () => message,
          pass: false
        };
      }
    }
});

function checkInstructionGas (logs, stepsOther) {
    const INIGAS = 3000000;
    let gasused = 0;
    let gasrefunded = 0;
    for (let i = 0; i < logs.length - 1; i++) {
        const gasCost = toBN(logs[i].gasCost).toNumber();
        const addlGasCost = toBN(logs[i].addlGasCost).toNumber();
        const refundedGas = toBN(logs[i].refundedGas).toNumber();
        gasrefunded += refundedGas;
        gasused += gasCost + addlGasCost - refundedGas;
        const remaining = INIGAS - gasused;
        const remainingOtherVM = remaining - gasrefunded;
        const message1 = `${i} - ${logs[i].name}: ${logs[i].gasCost} + ${logs[i].addlGasCost} - ${logs[i].refundedGas}; - ${stepsOther[i].name}: ${stepsOther[i].fee}`;
        expect(logs[i].gasCost.toString()).toBeSameGasCost([stepsOther[i].fee.toString(), message1]);
        const message2 = `${i} - ${logs[i].name}: ${logs[i].gasCost} + ${logs[i].addlGasCost || 0} - ${logs[i].refundedGas || 0}; remaining ${remaining} - ${stepsOther[i].name}: ${stepsOther[i].fee}, gasRefund: ${stepsOther[i].gasRefund}, gasLeft: ${stepsOther[i].gasLeft}, gasLeft+1: ${stepsOther[i+1].gasLeft}`;

        expect(remainingOtherVM.toString()).toBeSameGasCost([stepsOther[i+1].gasLeft.toString(), message2]);
    }
}

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

it('test infinite loop halt', async function () {
    const code = '60005b600160026001830360025700';
    const runtime = await evmjs.runtimeSim(code, []);
    const result = await runtime.mainRaw({...DEFAULT_TX_INFO, gasLimit: 23000}).catch(e => e.message);
    expect(result.includes('out of gas')).toBe(true);
});

it('test gascost 1', async function () {
    const code = '6010600401';
    const runtime = await evmjs.runtimeSim(code, []);
    await runtime.mainRaw({...DEFAULT_TX_INFO});
    expect(runtime.gas.used.toNumber()).toBe(21009);

    const {results, steps} = await getOtherVMResult(hexToUint8Array(code), []);
    expect(runtime.logs.length - 1).toBe(steps.length);
    checkInstructionGas(runtime.logs.slice(1), steps);
    expect(runtime.gas.used.toNumber()).toBe(results.gasUsed.toNumber() + BASE_TX_COST);
});

describe('eip2200', function () {
    // 3_1_1, 2
    it('test gascost eip2200_3_1_1,2', async function () {
        const code = '61333360205561333360205560205460005260206000f3';
        const runtime = await evmjs.runtimeSim(code, []);
        await runtime.mainRaw({...DEFAULT_TX_INFO});
        expect(runtime.gas.used.toNumber()).toBe(42630);

        const {results, steps} = await getOtherVMResult(hexToUint8Array(code), [], runtime.address);
        expect(runtime.logs.length - 1).toBe(steps.length);
        checkInstructionGas(runtime.logs.slice(1), steps);
        expect(runtime.gas.used.toNumber()).toBe(results.gasUsed.toNumber() + BASE_TX_COST);
    });

    // 3_1_2
    it('test gascost eip2200_3_1_2', async function () {
        const code = '61333360205560205460005260206000f3';
        const runtime = await evmjs.runtimeSim(code, []);
        await runtime.mainRaw({...DEFAULT_TX_INFO});
        expect(runtime.gas.used.toNumber()).toBe(41824);

        const {results, steps} = await getOtherVMResult(hexToUint8Array(code), [], runtime.address);
        expect(runtime.logs.length - 1).toBe(steps.length);
        checkInstructionGas(runtime.logs.slice(1), steps);
        expect(runtime.gas.used.toNumber()).toBe(results.gasUsed.toNumber() + BASE_TX_COST);
    });

    // 3_1_2_2, 3_2_1_1, 3_2_1_2, 3_2_2_2
    it('test gascost eip2200_3_2*', async function () {
        const code = '600060205560046020556000602055600560205560205460005260206000f3';
        const runtime = await evmjs.runtimeSim(code, []);
        await runtime.mainRaw({...DEFAULT_TX_INFO});
        expect(runtime.gas.used.toNumber()).toBe(44242);

        const {results, steps} = await getOtherVMResult(hexToUint8Array(code), [], runtime.address);
        const resultsGasRefund = steps[steps.length - 1].gasRefund.toNumber();
        expect(runtime.logs.length - 1).toBe(steps.length);
        checkInstructionGas(runtime.logs.slice(1), steps);
        expect(runtime.gas.used.toNumber()).toBe(results.gasUsed.toNumber() + BASE_TX_COST - resultsGasRefund);
    });

    // 3_1_2, 3_2_2_1
    it('test gascost eip2200_3_2_2_1', async function () {
        const code = '6006602055600060205560205460005260206000f3';
        const runtime = await evmjs.runtimeSim(code, []);
        await runtime.mainRaw({...DEFAULT_TX_INFO});
        expect(runtime.gas.used.toNumber()).toBe(23430);

        const {results, steps} = await getOtherVMResult(hexToUint8Array(code), [], runtime.address);
        const resultsGasRefund = steps[steps.length - 1].gasRefund.toNumber();
        expect(runtime.logs.length - 1).toBe(steps.length);
        checkInstructionGas(runtime.logs.slice(1), steps);
        expect(runtime.gas.used.toNumber()).toBe(results.gasUsed.toNumber() + BASE_TX_COST - resultsGasRefund);
    });

    it('test gascost eip2200_3_2_2_2', async function () {
        const code = '6006602055600060205560205460005260206000f3';
        const runtime = await evmjs.runtimeSim(code, []);
        await runtime.mainRaw({...DEFAULT_TX_INFO});
        expect(runtime.gas.used.toNumber()).toBe(23430);

        const {results, steps} = await getOtherVMResult(hexToUint8Array(code), [], runtime.address);
        const resultsGasRefund = steps[steps.length - 1].gasRefund.toNumber();
        expect(runtime.logs.length - 1).toBe(steps.length);
        checkInstructionGas(runtime.logs.slice(1), steps);
        expect(runtime.gas.used.toNumber()).toBe(results.gasUsed.toNumber() + BASE_TX_COST - resultsGasRefund);
    });

    it('test gascost eip2200_3_1_2_1', async function () {
        const code = '6233333360205560205460005260206000f3';
        const runtime = await evmjs.runtimeSim(code, []);
        await runtime.mainRaw({...DEFAULT_TX_INFO});
        expect(runtime.gas.used.toNumber()).toBe(41824);

        const {results, steps} = await getOtherVMResult(hexToUint8Array(code), [], runtime.address);
        expect(runtime.logs.length - 1).toBe(steps.length);
        checkInstructionGas(runtime.logs.slice(1), steps);
        expect(runtime.gas.used.toNumber()).toBe(results.gasUsed.toNumber() + BASE_TX_COST);
    });

    it('test gascost eip2200_3_2_1_2', async function () {
        const code = '60066020556000602055600560205560205460005260206000f3';
        const runtime = await evmjs.runtimeSim(code, []);
        await runtime.mainRaw({...DEFAULT_TX_INFO});
        expect(runtime.gas.used.toNumber()).toBe(43436);
        logLogs(runtime.logs);
        const {results, steps} = await getOtherVMResult(hexToUint8Array(code), [], runtime.address);
        const resultsGasRefund = steps[steps.length - 1].gasRefund.toNumber();
        expect(runtime.logs.length - 1).toBe(steps.length);
        checkInstructionGas(runtime.logs.slice(1), steps);
        expect(runtime.gas.used.toNumber()).toBe(results.gasUsed.toNumber() + BASE_TX_COST - resultsGasRefund);
    });

    it('test gascost eip2200_3_1_2_2', async function () {
        const code = '6000602055600460205560205460005260206000f3';
        const runtime = await evmjs.runtimeSim(code, []);
        await runtime.mainRaw({...DEFAULT_TX_INFO});
        expect(runtime.gas.used.toNumber()).toBe(42630);

        const {results, steps} = await getOtherVMResult(hexToUint8Array(code), [], runtime.address);
        expect(runtime.logs.length - 1).toBe(steps.length);
        checkInstructionGas(runtime.logs.slice(1), steps);
        expect(runtime.gas.used.toNumber()).toBe(results.gasUsed.toNumber() + BASE_TX_COST);
    });
})

describe.each([
    // ['ewasmjsvm', 'bin'],
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

        let o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);
        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);
    });

    it('test c2, simple fallback with constructor', async function () {
        const runtime = await jsvm.deploy(contracts.c2[field], contracts.c2.abi)({...DEFAULT_TX_INFO});
        deployments.c2 = runtime;
        const answ = await runtime.main({...DEFAULT_TX_INFO});
        expect(answ.val.toNumber()).toBe(999999);

        const lastL = runtime.logs[runtime.logs.length - 1];
        expect(uint8ArrayToHex(runtime.bin)).toBe(uint8ArrayToHex(lastL.context[lastL.contractAddress].runtimeCode));

        let o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);
        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);
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

        o = await getOtherVMResult(runtime.bin, runtime.txInfo.data, runtime.address);
        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);

        expect(answ.addr).toBe(checksum(runtime.address));
        expect(answ.caller).toBe(checksum(tx_info.from));
        // TODO
        // expect(answ.addr_balance).toBe(accounts[0].balance);
        expect(answ.callvalue).toBe(tx_info.value);
        expect(answ.calldatasize).toBe(64);
        expect(answ.origin).toBe(checksum(tx_info.from));
        expect(answ.difficulty.toNumber()).toBe(block.difficulty);
        expect(answ.stored_addr).toBe(checksum(runtime.address));
        expect(answ.gas_left.toNumber()).toBe(957034); // TODO check this
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
        expect(answ.multiv.toHexString()).toBe('0x040000');
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

        let o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);
        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);

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

        let o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);
        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);
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
        let o = await getOtherVMResult(runtime.bin, []);
        // expect(runtime.logs.length - 1).toBe(o.steps.length);
        // checkInstructionGas(runtime.logs.slice(1), o.steps);
        // expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);

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

        // let o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);
        // expect(runtime.logs.length - 1).toBe(o.steps.length);
        // checkInstructionGas(runtime.logs.slice(1), o.steps);
        // expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);

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

        let o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);
        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);
    });

    const itnested = name === 'evmjs' ? it : it.skip;
    itnested('test c9 calls', async function () {
        const runtime = await jsvm.deploy(contracts.c9[field], contracts.c9.abi)(DEFAULT_TX_INFO);
        deployments.c9 = runtime;

        const runtime_ = await jsvm.deploy(contracts.c9_[field], contracts.c9_.abi)(DEFAULT_TX_INFO);
        deployments.c9_ = runtime_;

        const answ = await runtime.main(deployments.c9_.address, deployments.c2.address, DEFAULT_TX_INFO);
        expect(answ[0]).toBe('0x00000000000000000000000000000000000000000000000000000000000f424900000000000000000000000000000000000000000000000000000000000f4249');

        let o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);
        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);
    });

    it('test c10 - deploy args1', async function () {
        const noconstructorAbi = contracts.c10.abi.filter(v => v.name !== 'constructor');
        const runtime = await jsvm.deploy(contracts.c10[field], noconstructorAbi)('0x000000000000000000000000000000000000000000000000000000000000000f', {...DEFAULT_TX_INFO, gasLimit: 6000000});

        let valueb = (await runtime.valueb(DEFAULT_TX_INFO))[0].toNumber();
        expect(valueb).toBe(15);
    });

    it('test c10 - deploy args2', async function () {
        const noconstructorAbi = contracts.c10.abi.filter(v => v.name !== 'constructor');
        const runtime = await jsvm.deploy(contracts.c10[field] + '000000000000000000000000000000000000000000000000000000000000000f', noconstructorAbi)({...DEFAULT_TX_INFO, gasLimit: 6000000});

        let valueb = (await runtime.valueb(DEFAULT_TX_INFO))[0].toNumber();
        expect(valueb).toBe(15);
    });

    it('test c10 - simple functions', async function () {
        let o;
        const runtime = await jsvm.deploy(contracts.c10[field], contracts.c10.abi)(15, {...DEFAULT_TX_INFO, gasLimit: 6000000});
        deployments.c10 = runtime;

        let valueb = (await runtime.valueb(DEFAULT_TX_INFO))[0].toNumber();
        expect(valueb).toBe(15);

        // Test slt(100, 7) -> slt(0x0000000000000000000000000000000000000000000000000000000000000064, 0x8000000000000000000000000000000000000000000000000000000000000007)
        let anint = (await runtime.anint(DEFAULT_TX_INFO))[0].toNumber();
        expect(anint).toBe(100);

        await runtime.testint(7, DEFAULT_TX_INFO);
        anint = (await runtime.anint(DEFAULT_TX_INFO))[0].toNumber();
        expect(anint).toBe(100 - 7);

        let answ = await runtime.sum(8, 2, DEFAULT_TX_INFO);
        expect(answ.c.toNumber()).toBe(10);
        o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);
        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);

        answ = await runtime.testAddress(runtime.address, DEFAULT_TX_INFO);
        expect(answ[0].toLowerCase()).toBe(runtime.address);
        o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);
        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);

        let value = (await runtime.value(DEFAULT_TX_INFO))[0].toNumber();
        expect(value).toBe(5);
        o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);

        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);

        let balance = jsvm.getPersistence().get(runtime.address).balance.toNumber();

        const newvalue = await runtime.addvalue(10, {...DEFAULT_TX_INFO, value: 40});
        value += 50;
        expect(newvalue[0].toNumber()).toBe(value);

        const val = (await runtime.value(DEFAULT_TX_INFO))[0].toNumber();
        expect(val).toBe(value);
        o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);
        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);

        const newbalance = jsvm.getPersistence().get(runtime.address).balance.toNumber();
        balance += 40;
        expect(newbalance).toBe(balance);
    }, 5000);

    it('test c10 - callStatic, call', async function () {
        const runtime = await jsvm.deploy(contracts.c10[field], contracts.c10.abi)(15, DEFAULT_TX_INFO);
        deployments.c10 = runtime;

        const _runtime = await jsvm.deploy(contracts.c12[field], contracts.c12.abi)(DEFAULT_TX_INFO);

        let value = (await deployments.c10.value({...DEFAULT_TX_INFO}))[0].toNumber();
        let balance = jsvm.getPersistence().get(deployments.c10.address).balance.toNumber();

        answ = await _runtime.test_staticcall(deployments.c10.address, 8, 2, DEFAULT_TX_INFO);
        expect(answ.c.toNumber()).toBe(10);
        expect(jsvm.getPersistence().get(deployments.c10.address).balance.toNumber()).toBe(balance);
        let o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);
        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);

        answ = await _runtime.test_staticcall_address(deployments.c10.address, deployments.c10.address, DEFAULT_TX_INFO);
        expect(eBN2addr(answ.c)).toBe(deployments.c10.address);
        expect(jsvm.getPersistence().get(deployments.c10.address).balance.toNumber()).toBe(balance);
        o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);
        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);

        await _runtime.test_call(deployments.c10.address, 10, {...DEFAULT_TX_INFO, value: 40});
        const val2 = (await deployments.c10.value({...DEFAULT_TX_INFO}))[0].toNumber();
        expect(val2).toBe(value + 10 + 40);
        // expect(jsvm.getPersistence().get(runtime.address).balance.toNumber()).toBe(balance + 40);
        // expect(jsvm.getPersistence().get(_runtime.address).balance.toNumber()).toBe(0);
        o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);
        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);
    }, 15000);

    it('test c10 revert', async function () {
        const runtime = await jsvm.deploy(contracts.c10[field], contracts.c10.abi)(15, {...DEFAULT_TX_INFO});
        let value = (await runtime.value({...DEFAULT_TX_INFO}))[0].toNumber();
        let balance = jsvm.getPersistence().get(runtime.address).balance.toNumber();

        await expect(runtime._revert({...DEFAULT_TX_INFO, value: 40})).rejects.toThrow();

        const val = (await runtime.value({...DEFAULT_TX_INFO}))[0].toNumber();
        expect(val).toBe(value);

        const newbalance = jsvm.getPersistence().get(runtime.address).balance.toNumber();
        expect(newbalance).toBe(balance);
    });

    it('test c10 precompiles', async function () {
        let o;
        const runtime = await jsvm.deploy(contracts.c10[field], contracts.c10.abi)(15, {...DEFAULT_TX_INFO, gasLimit: 6000000});
        deployments.c10 = runtime;

        let result = await runtime.recover('0x7dbaf558b0a1a5dc7a67202117ab143c1d8605a983e4a743bc06fcc03162dc0d', '0x5d99b6f7f6d1f73d1a26497f2b1c89b24c0993913f86e9a2d02cd69887d9c94f3c880358579d811b21dd1b7fd9bb01c1d81d10e69f0384e675c32b39643be89200', DEFAULT_TX_INFO);
        expect(result.signer).toBe('0x2cc1166f6212628A0deEf2B33BEFB2187D35b86c');
    });

    it('test c11 - for loop', async function () {
        const runtime = await jsvm.deploy(contracts.c11[field], contracts.c2.abi)(DEFAULT_TX_INFO);
        let answ = await runtime.main( DEFAULT_TX_INFO);
        expect(answ.val.toNumber()).toBe(11);

        let o = await getOtherVMResult(runtime.bin, runtime.txInfo.data);
        expect(runtime.logs.length - 1).toBe(o.steps.length);
        checkInstructionGas(runtime.logs.slice(1), o.steps);
        expect(runtime.gas.used.toNumber()).toBe(o.results.gasUsed.toNumber() + BASE_TX_COST);
    });

});

it('simulateTransaction from tx hash', async function () {
    const providerName = 'rinkeby';
    const hash = '0x8fb25b0f50df098f7a189ae34c0f8d62fc753dcacd4532b055326072577ef38e';
    const provider = ethers.providers.getDefaultProvider(providerName);
    const evmjs = _evmjs({provider});
    const runtime = await evmjs.simulateTransaction(hash).catch(e => e.runtime);
    const AL = uint8ArrayToHex(await runtime.mainRaw({
        data: '0xee46b52d',
        from: runtime.txInfo.from,
        to: runtime.txInfo.to,
        value: toBN(0),
    }));
    const balance = await runtime.mainRaw({
        data: '0x1f14df69' + '000000000000000000000000' + runtime.txInfo.from.slice(2) + AL.slice(2),
        from: runtime.txInfo.from,
        to: runtime.txInfo.to,
        value: toBN(0),
    });
    expect(uint8ArrayToHex(balance)).toBe('0x0000000000000000000000000000000000000000000000000000000000053020');

}, 50000);

it('simulateTransaction with initial states', async function () {
    const providerName = 'rinkeby';
    const hash = '0x8fb25b0f50df098f7a189ae34c0f8d62fc753dcacd4532b055326072577ef38e';
    const ALBalanceStorageKey = '0xda708552cdeb2cc9614cfb96e57d63181beb1979a39be45d9f0c35fe9a51e855';
    const provider = ethers.providers.getDefaultProvider(providerName);
    const evmjs = _evmjs();
    const {runtime, transaction} = await evmjs.runtimeFromTransaction(hash, provider);
    const initialALBalance = await provider.getStorageAt(runtime.address, ALBalanceStorageKey, runtime.blockNumber - 1);
    const expectedALBalance = await provider.getStorageAt(runtime.address, ALBalanceStorageKey, runtime.blockNumber);
    const storage = {
        '0x79911e2faba13a7294a49689eebaab4d59ef3f5b890edcbf0d28e5173aceb2b5': '0x000000000000000000000000d6866368fcbe89bf10acf948bc5eb19b01e4df82',
        '0x0000000000000000000000000000000000000000000000000000000000000000': '0x000000000000000000000000d6866368fcbe89bf10acf948bc5eb19b01e4df82',
        '0x39e081f012a1649fce5496531c003f7f38fb7e7a4eef0bf64b15b01a8c74546b': '0x0000000000000000000000000000000000000000000000000000000000035b60',
        '0xf06d282f967055cb1eee17e04aa005b9682a620f4bbcfaee55ba78607a3d87ae': '0x00000000000000000000000000000000000000000000000000000000000007d0',
        '0x0000000000000000000000000000000000000000000000000000000000000002': '0xa7e8030f20d51298078da9ed202f23280c7cf8b6b49a999a7e9457f8f1938587',
        '0xec061709de2491458f4c981032059d7d19b0e55f45018bac6b3e660bdc959a59': '0x00000000000000000000000000000000000000000000000000000000000005dc',
        '0x0000000000000000000000000000000000000000000000000000000000000006': '0x00000000000000000000000000000000000000000000000000000000000003e8',
        '0xcaff291fe014adc6b72a172705750b4cabe8f8667664d2924a166caab2885648': '0x0000000000000000000000000000000000000000000000000000000000000064',
        '0xda708552cdeb2cc9614cfb96e57d63181beb1979a39be45d9f0c35fe9a51e855':
        '0x0000000000000000000000000000000000000000000000000000000000002710',
        '0x79dd35115d34011f9dcc309684ee67b0c2426ac60391dc07ebcde97d96533f6e': '0x0000000000000000000000000000000000000000000000000000000000038270',
        "0x0000000000000000000000000000000000000000000000000000000000000001": "0x0000000000000000000000000000000000000000000000000000000000041eb0",
    }
    const currentAccounts = {
        [runtime.address]: {
            address: runtime.address,
            runtimeCode: runtime.bin,
            storage,
        }
    }
    const ALTx = {
        data: '0xee46b52d',
        from: transaction.from,
        to: transaction.to,
        value: toBN(0),
    }

    evmjs.setContext({accounts: currentAccounts});

    const AL = uint8ArrayToHex(await runtime.mainRaw(ALTx));
    const balanceTx = {
        data: '0x1f14df69' + '000000000000000000000000' + transaction.from.slice(2) + AL.slice(2),
        from: transaction.from,
        to: runtime.address,
        value: toBN(0),
    }

    const balanceIni = await runtime.mainRaw(balanceTx);
    expect(uint8ArrayToHex(balanceIni)).toBe(initialALBalance);
    expect(uint8ArrayToHex(evmjs.getPersistence().get(runtime.address).storage['0x0000000000000000000000000000000000000000000000000000000000000001'])).toBe('0x0000000000000000000000000000000000000000000000000000000000041eb0');

    expect(uint8ArrayToHex(evmjs.getPersistence().get(runtime.address).storage['0x39e081f012a1649fce5496531c003f7f38fb7e7a4eef0bf64b15b01a8c74546b'])).toBe('0x0000000000000000000000000000000000000000000000000000000000035b60');

    expect(uint8ArrayToHex(evmjs.getPersistence().get(runtime.address).storage['0x79dd35115d34011f9dcc309684ee67b0c2426ac60391dc07ebcde97d96533f6e'])).toBe('0x0000000000000000000000000000000000000000000000000000000000038270');

    expect(uint8ArrayToHex(evmjs.getPersistence().get(runtime.address).storage['0xda708552cdeb2cc9614cfb96e57d63181beb1979a39be45d9f0c35fe9a51e855'])).toBe('0x0000000000000000000000000000000000000000000000000000000000002710');

    await runtime.mainRaw(transaction);

    const balance = await runtime.mainRaw(balanceTx);
    const balanceHex = uint8ArrayToHex(balance);
    expect(balanceHex).toBe(expectedALBalance);
    expect(balanceHex).toBe('0x0000000000000000000000000000000000000000000000000000000000053020');

    expect(uint8ArrayToHex(evmjs.getPersistence().get(runtime.address).storage['0x0000000000000000000000000000000000000000000000000000000000000001'])).toBe('0x000000000000000000000000000000000000000000000000000000000005cc60');

    expect(uint8ArrayToHex(evmjs.getPersistence().get(runtime.address).storage['0x39e081f012a1649fce5496531c003f7f38fb7e7a4eef0bf64b15b01a8c74546b'])).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');

    expect(uint8ArrayToHex(evmjs.getPersistence().get(runtime.address).storage['0x79dd35115d34011f9dcc309684ee67b0c2426ac60391dc07ebcde97d96533f6e'])).toBe('0x0000000000000000000000000000000000000000000000000000000000053020');

    expect(uint8ArrayToHex(evmjs.getPersistence().get(runtime.address).storage['0xda708552cdeb2cc9614cfb96e57d63181beb1979a39be45d9f0c35fe9a51e855'])).toBe('0x0000000000000000000000000000000000000000000000000000000000053020');

    expect(uint8ArrayToHex(evmjs.getPersistence().get(runtime.address).storage['0xe2ef2be5029fc4cbcba12118a35c1c437888c9f0c45bd599b391d2a691586260'])).toBe('0x00000000000000000000000000000000000000000000000000000000000080e8');
}, 400000);

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

function logLogs (logs) {
    console.log(logs.map(v => {
        return `${v.name} ${toBN(v.gasCost).toNumber()} ${toBN(v.addlGasCost).toNumber()} ${toBN(v.refundedGas).toNumber()}`;
    }).join('\n'));
}
