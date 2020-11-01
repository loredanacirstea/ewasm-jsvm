const BN = require('bn.js');
const {
    hexToUint8Array,
    toBN,
    BN2uint8arr,
}  = require('./utils.js');
const {ERROR} = require('./constants');
const evmasm = require('evmasm');

const initializeImports = (
    vmcore,
    txObj,
    internalCallWrap,
    asyncResourceWrap,
    getMemory,
    getCache,
    finishAction,
    revertAction,
    logger,
) => {
    const jsvm_env = vmcore.call(txObj, internalCallWrap, asyncResourceWrap, getMemory, getCache);
    const api = {ethereum: {}};

    api.ethereum = {
        storeMemory: function (offset, bytes, stack) {
            jsvm_env.storeMemory(BN2uint8arr(bytes), offset);
            logger.debug('MSTORE', [bytes, offset], [], getCache(), getMemory(), stack);
        },
        storeMemory8: function (offset, bytes, stack) {
            jsvm_env.storeMemory8(BN2uint8arr(bytes), offset);
            logger.debug('MSTORE8', [bytes, offset], [], getCache(), getMemory(), stack);
        },
        loadMemory: function (offset, stack) {
            const result = jsvm_env.loadMemory(offset);
            logger.debug('MLOAD', [offset], [result], getCache(), getMemory(), stack);
            return toBN(result);
        },
        useGas: function (amount, stack) {
            jsvm_env.useGas(amount);
            logger.debug('USEGAS', [amount], [], getCache(), getMemory(), stack);
        },
        getAddress: function (stack) {
            const address = jsvm_env.getAddress();
            logger.debug('ADDRESS', [], [address], getCache(), getMemory(), stack);
            return toBN(address);
        },
        // result is u128
        getExternalBalance: function (_address, stack) {
            const address = BN2uint8arr(_address);
            const balance = toBN(jsvm_env.getExternalBalance(address));
            logger.debug('BALANCE', [_address], [balance], getCache(), getMemory(), stack);
            return balance;
        },
        // result i32 Returns 0 on success and 1 on failure
        getBlockHash: function (number, stack) {
            const hash = toBN(jsvm_env.getBlockHash(number));
            logger.debug('BLOCKHASH', [number], [hash], getCache(), getMemory(), stack);
            return hash;
        },
        // result i32 Returns 0 on success, 1 on failure and 2 on revert
        call: function (
            gas_limit,
            address, // the memory offset to load the address from (address)
            value,
            dataOffset,
            dataLength,
            outputOffset,
            outputLength,
            stack
        ) {
            const result = jsvm_env.call(
                gas_limit,
                BN2uint8arr(address),
                BN2uint8arr(value),
                dataOffset,
                dataLength,
                outputOffset,
                outputLength,
            );
            logger.debug('CALL', [gas_limit,
                address,
                value,
                dataOffset,
                dataLength,
                outputOffset,
                outputLength,], [result], getCache(), getMemory(), stack);
            return toBN(result);
        },
        callDataCopy: function (resultOffset, dataOffset, length, stack) {
            const result = jsvm_env.callDataCopy(resultOffset, dataOffset, length);
            logger.debug('CALLDATACOPY', [resultOffset, dataOffset, length], [result], getCache(), getMemory(), stack);
            return;
        },
        // returns i32
        getCallDataSize: function (stack) {
            const result = toBN(jsvm_env.getCallDataSize());
            logger.debug('CALLDATASIZE', [], [result], getCache(), getMemory(), stack);
            return result;
        },
        callDataLoad: function(dataOffset, stack) {
            const result = jsvm_env.callDataLoad(dataOffset);
            logger.debug('CALLDATALOAD', [dataOffset], [result], getCache(), getMemory(), stack);
            return toBN(result);
        },
        // result i32 Returns 0 on success, 1 on failure and 2 on revert
        callCode: function (
            gas_limit,
            address,
            value,
            dataOffset,
            dataLength,
            outputOffset,
            outputLength,
            stack
        ) {
            const result = jsvm_env.callCode(
                gas_limit,
                BN2uint8arr(address),
                BN2uint8arr(value),
                dataOffset,
                dataLength,
                outputOffset,
                outputLength
            );
            logger.debug('CALLCODE', [gas_limit_i64, addressOffset_i32ptr_address, valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32], [result], getCache(), getMemory(), stack);
            return result;
        },
        // result i32 Returns 0 on success, 1 on failure and 2 on revert
        callDelegate: function (
            gas_limit_i64,
            address,
            dataOffset,
            dataLength,
            outputOffset,
            outputLength,
            stack
        ) {
            const result = jsvm_env.callDelegate(
                gas_limit_i64,
                BN2uint8arr(address),
                dataOffset,
                dataLength,
                outputOffset,
                outputLength
            );
            logger.debug('DELEGATECALL', [
                gas_limit_i64,
                address,
                dataOffset,
                dataLength,
                outputOffset,
                outputLength], [result], getCache(), getMemory(), stack);
            return result;
        },
        // result i32 Returns 0 on success, 1 on failure and 2 on revert
        callStatic: function (
            gas_limit_i64,
            address,
            dataOffset,
            dataLength,
            outputOffset,
            outputLength,
            stack
        ) {
            const result = jsvm_env.callStatic(
                gas_limit_i64,
                BN2uint8arr(address),
                dataOffset,
                dataLength,
                outputOffset,
                outputLength
            );

            logger.debug('STATICCALL', [
                gas_limit_i64,
                address,
                dataOffset,
                dataLength,
                outputOffset,
                outputLength], [result], getCache(), getMemory(), stack);
            return result;
        },
        storageStore: function (pathOffset, value, stack) {
            jsvm_env.storageStore(BN2uint8arr(pathOffset), BN2uint8arr(value));
            logger.debug('SSTORE', [pathOffset, value], [], getCache(), getMemory(), stack);
        },
        storageLoad: function (pathOffset, stack) {
            const value = jsvm_env.storageLoad(BN2uint8arr(pathOffset));
            logger.debug('SLOAD', [pathOffset], [value], getCache(), getMemory(), stack);
            return toBN(value);
        },
        getCaller: function (stack) {
            const address = jsvm_env.getCaller();
            logger.debug('CALLER', [], [address], getCache(), getMemory(), stack);
            return toBN(address);
        },
        getCallValue: function (stack) {
            const value = jsvm_env.getCallValue();
            logger.debug('CALLVALUE', [], [value], getCache(), getMemory(), stack);
            return toBN(value);
        },
        codeCopy: function (resultOffset, codeOffset, length, stack) {
            jsvm_env.codeCopy(resultOffset, codeOffset, length);
            logger.debug('CODECOPY', [resultOffset, codeOffset, length], [], getCache(), getMemory(), stack);
        },
        // returns i32 - code size current env
        getCodeSize: function(stack) {
            const result = jsvm_env.getCodeSize();
            logger.debug('CODESIZE', [], [result], getCache(), getMemory(), stack);
            return toBN(result);
        },
        // block’s beneficiary address
        getBlockCoinbase: function(stack) {
            const value = jsvm_env.getBlockCoinbase();
            logger.debug('COINBASE', [], [value], getCache(), getMemory(), stack);
            return toBN(value);
        },
        create: function (
            value,
            dataOffset,
            dataLength,
            stack
        ) {
            const address = jsvm_env.create(value, dataOffset, dataLength);

            logger.debug('CREATE', [value,
                dataOffset,
                dataLength,
            ], [address], getCache(), getMemory(), stack);

            return toBN(address);
        },
        getBlockDifficulty: function (stack) {
            const value = jsvm_env.getBlockDifficulty();
            logger.debug('DIFFICULTY', [], [value], getCache(), getMemory(), stack);
            return toBN(value);
        },
        externalCodeCopy: function (
            address,
            resultOffset,
            codeOffset,
            dataLength,
            stack
        ) {
            jsvm_env.externalCodeCopy(
                BN2uint8arr(address),
                resultOffset,
                codeOffset,
                dataLength,
            )
            logger.debug('EXTCODECOPY', [address,
                resultOffset,
                codeOffset,
                dataLength,
            ], [], getCache(), getMemory(), stack);
        },
        // Returns extCodeSize i32
        getExternalCodeSize: function (address, stack) {
            const result = jsvm_env.getExternalCodeSize(BN2uint8arr(address));
            logger.debug('EXTCODESIZE', [address], [result], getCache(), getMemory(), stack);
            return toBN(result);
        },
        // result gasLeft i64
        getGasLeft: function (stack) {
            const result = jsvm_env.getGasLeft();
            logger.debug('GAS', [], [result], getCache(), getMemory(), stack);
            return toBN(result);
        },
        // result blockGasLimit i64
        getBlockGasLimit: function (stack) {
            const result = jsvm_env.getBlockGasLimit();
            logger.debug('GASLIMIT', [], [result], getCache(), getMemory(), stack);
            return toBN(result);
        },
        getTxGasPrice: function (stack) {
            const result = jsvm_env.getTxGasPrice();
            logger.debug('GASPRICE', [], [result], getCache(), getMemory(), stack);
            return toBN(result);
        },
        log: function (
            dataOffset,
            dataLength,
            ...topics
        ) {
            const stack = topics.pop();
            const numberOfTopics = topics.length;
            jsvm_env.log(
                dataOffset,
                dataLength,
                numberOfTopics,
                topics,
            );
            logger.debug('LOG' + numberOfTopics, [dataOffset,
                dataLength,
                numberOfTopics,
                ...topics
            ], [], getCache(), getMemory(), stack);
        },
        log0: function(dataOffset, dataLength, ...topics) {
            api.ethereum.log(dataOffset, dataLength, ...topics);
        },
        log1: function(dataOffset, dataLength, ...topics) {
            api.ethereum.log(dataOffset, dataLength, ...topics);
        },
        log2: function(dataOffset, dataLength, ...topics) {
            api.ethereum.log(dataOffset, dataLength, ...topics);
        },
        log3: function(dataOffset, dataLength, ...topics) {
            api.ethereum.log(dataOffset, dataLength, ...topics);
        },
        log4: function(dataOffset, dataLength, ...topics) {
            api.ethereum.log(dataOffset, dataLength, ...topics);
        },
        // result blockNumber i64
        getBlockNumber: function (stack) {
            const result = jsvm_env.getBlockNumber();
            logger.debug('NUMBER', [], [result], getCache(), getMemory(), stack);
            return toBN(result);
        },
        getTxOrigin: function (stack) {
            const address = jsvm_env.getTxOrigin();
            logger.debug('ORIGIN', [], [address], getCache(), getMemory(), stack);
            return toBN(address);
        },
        finish: function (dataOffset, dataLength, stack) {
            const res = jsvm_env.finish(dataOffset, dataLength);
            logger.debug('FINISH', [dataOffset, dataLength], [res], getCache(), getMemory(), stack);
            finishAction(res);
        },
        revert: function (dataOffset, dataLength, stack) {
            const res = jsvm_env.revert(dataOffset, dataLength);
            console.log('revert');
            logger.debug('REVERT', [dataOffset, dataLength], [res], getCache(), getMemory(), stack);
            revertAction(res);
        },
        // result dataSize i32
        getReturnDataSize: function (stack) {
            const result = jsvm_env.getReturnDataSize();
            logger.debug('RETURNDATASIZE', [], [result], getCache(), getMemory(), stack);
            return toBN(address);
        },
        returnDataCopy: function (resultOffset, dataOffset, length, stack) {
            jsvm_env.returnDataCopy(resultOffset, dataOffset, length);
            logger.debug('RETURNDATACOPY', [resultOffset, dataOffset, length], [], getCache(), getMemory(), stack);
        },
        selfDestruct: function (address, stack) {
            jsvm_env.selfDestruct(BN2uint8arr(address));
            logger.debug('SELFDESTRUCT', [address], [], getCache(), getMemory(), stack);
            finishAction();
        },
        // result blockTimestamp i64,
        getBlockTimestamp: function (stack) {
            const result = jsvm_env.getBlockTimestamp();
            logger.debug('TIMESTAMP', [], [result], getCache(), getMemory(), stack);
            return toBN(result);
        },
        return: (offset, length, stack) => {
            const result = jsvm_env.finish(offset, length);
            logger.debug('RETURN', [offset, length], [result], getCache(), getMemory(), stack);
            return finishAction(result);
        },
        revert: (offset, length, stack) => {
            const result = jsvm_env.revert(offset, length);
            logger.debug('REVERT', [offset, length], [result], getCache(), getMemory(), stack);
            return revertAction(result);
        },
        stop: (stack) => {
            return api.ethereum.return(toBN(0), toBN(0), stack);
        },
        keccak256: () => {
            throw new Error('Not implemented');
        },
        uint256Max: () => new BN('10000000000000000000000000000000000000000000000000000000000000000', 16),
        // mimick evm overflow
        add: (a, b, stack) => {
            const result = a.add(b).mod(api.ethereum.uint256Max());
            logger.debug('ADD', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        mul: (a, b, stack) => {
            const result = a.mul(b).mod(api.ethereum.uint256Max());
            logger.debug('MUL', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        // mimick evm underflow
        sub: (a, b, stack) => {
            const result = a.sub(b).mod(api.ethereum.uint256Max());
            logger.debug('SUB', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        div: (a, b, stack) => {
            const result = a.abs().div(b.abs());
            logger.debug('DIV', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        sdiv: (a, b, stack) => {
            const result = a.div(b);
            logger.debug('SDIV', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        mod: (a, b, stack) => {
            const result = a.abs().mod(b.abs());
            logger.debug('MOD', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        smod: (a, b, stack) => {
            const result = a.mod(b);
            logger.debug('SMOD', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        addmod: (a, b, c, stack) => {
            const result = api.ethereum.mod(api.ethereum.add(a, b), c);
            logger.debug('ADDMOD', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        mulmod: (a, b, c, stack) => {
            const result = api.ethereum.mod(api.ethereum.mul(a, b), c);
            logger.debug('MULMOD', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        exp: (a, b, stack) => {
            if (b.lt(toBN(0))) return toBN(0);
            const result = a.exp(b);
            logger.debug('EXP', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        signextend: (a, b) => {
            throw new Error('signextend unimplemented');
        },
        lt: (a, b, stack) => {
            let result = a.abs().lt(b.abs());
            result = toBN(result ? 1 : 0);
            logger.debug('LT', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        gt: (a, b, stack) => {
            let result = a.abs().gt(b.abs());
            result = toBN(result ? 1 : 0);
            logger.debug('GT', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        slt: (a, b, stack) => {
            let result = a.lt(b);
            result = toBN(result ? 1 : 0);
            logger.debug('SLT', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        sgt: (a, b, stack) => {
            let result = a.gt(b);
            result = toBN(result ? 1 : 0);
            logger.debug('SGT', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        eq: (a, b, stack) => {
            let result = a.eq(b);
            result = toBN(result ? 1 : 0);
            logger.debug('EQ', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        iszero: (a, stack) => {
            let result = a.isZero();
            result = toBN(result ? 1 : 0);
            logger.debug('SAR', [a], [result], getCache(), getMemory(), stack);
            return result;
        },
        and: (a, b, stack) => {
            const result = a.and(b);
            logger.debug('AND', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        or: (a, b, stack) => {
            const result = a.or(b);
            logger.debug('OR', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        xor: (a, b, stack) => {
            const result = a.xor(b);
            logger.debug('XOR', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        not: (a, stack) => {
            const result = a.notn(256);
            logger.debug('NOT', [a], [result], getCache(), getMemory(), stack);
            return result;
        },
        byte: (nth, bb, stack) => {
            const result = BN2uint8arr(bb).slice(nth, nth + 1);
            logger.debug('BYTE', [a, b], [result], getCache(), getMemory(), stack);
            return toBN(result);
        },
        shl: (a, b, stack) => {
            const result = b.shln(a.toNumber());
            logger.debug('SHL', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        shr: (a, b, stack) => {
            const result = b.shrn(a.toNumber());
            logger.debug('SHR', [a, b], [result], getCache(), getMemory(), stack);
            return result;
        },
        sar: (nobits, value, stack) => {
            const _nobits = nobits.toNumber();
            let valueBase2;
            if (value.isNeg()) {
                valueBase2 = value.toTwos(256).toString(2);
            } else {
                valueBase2 = value.toString(2).padStart(256, '0');
            }
            // remove LSB * _nobits
            valueBase2 = valueBase2.substring(0, valueBase2.length - _nobits);
            // add MSB * _nobits
            valueBase2 = valueBase2[0].repeat(_nobits) + valueBase2;
            const result = (new BN(valueBase2, 2)).fromTwos(256);
            logger.debug('SAR', [nobits, value], [result], getCache(), getMemory(), stack);
            return result;
        },
        handlePush: (code, bytecode, position, stack) => {
            const no = code - 0x60 + 1;
            const value = toBN(bytecode.slice(position, position + no));
            logger.debug('PUSH' + no + ' 0x' + value.toString(16).padStart(no, '0'), [value], [], getCache(), getMemory(), stack);
            stack.push(value);
            position += no;
            return {bytecode: bytecode, stack, position};
        },
        handleSwap: (code, stack) => {
            const no = code - 0x90 + 1;
            if (no >= stack.length) throw new Error(`Invalid SWAP${no} ; stack: ${stack}`);
            const last = stack.pop();
            const spliced = stack.splice(stack.length - no, 1, last);
            stack.push(spliced[0]);
            logger.debug('SWAP' + no, [], [], getCache(), getMemory(), stack);
            return stack;
        },
        handleDup: (code, stack) => {
            const no = code - 0x80 + 1;
            if (no > stack.length) throw new Error(`Invalid DUP${no} ; stack: ${stack}`);
            const value = stack[stack.length - no];

            logger.debug('DUP' + no, [], [], getCache(), getMemory(), stack);
            stack.push(value);
            return stack;
        },
        jump: (newpos, stack) => {
            if (!newpos && newpos !== 0) throw new Error(`Invalid JUMP ${newpos}`);
            newpos = newpos.toNumber();
            logger.debug('JUMP', [newpos], [], getCache(), getMemory(), stack);
            return newpos;
        },
        jumpi: (newpos, condition, stack) => {
            logger.debug('JUMPI', [condition, newpos], [], getCache(), getMemory(), stack);
            newpos = newpos.toNumber();
            if (condition.toNumber() === 1) return newpos;
        },
        jumpdest:(stack) => {
            logger.debug('JUMPDEST', [], [], getCache(), getMemory(), stack);
        },
        pop: stack => {
            stack.pop();
            logger.debug('POP', [], [], getCache(), getMemory(), stack);
            return stack;
        }
    }

    return api;
}

const instantiateModule = (bytecode, importObj) => {
    if (typeof bytecode === 'string') bytecode = hexToUint8Array(bytecode);
    if (!(bytecode instanceof Uint8Array)) throw new Error('evm - bytecode not Uint8Array');
    const wmodule = {
        instance: {
            exports: {
                main: calldata => interpreter({bytecode, importObj: importObj.ethereum, calldata, position: 0}),
                memory: new WebAssembly.Memory({ initial: 2 }),
            }
        }

    }
    return new Promise((resolve, reject) => {
        resolve(wmodule);
    });
}

const interpreter = async ({bytecode, importObj, stack = [], calldata=[], position=0}) => {
    ({bytecode, stack, position} = await interpretOpcode({bytecode, stack, importObj, position}));
    if (position > 0) await interpreter({bytecode, importObj, stack, calldata, position});
}

const interpretOpcode = async ({bytecode, stack, importObj, position}) => {
    const hexcode = bytecode[position].toString(16).padStart(2, '0');
    position += 1;
    const code = parseInt(hexcode, 16);
    const opcode = opcodes[hexcode];

    if (opcode && importObj[opcode.name]) {
        const args = [];
        for (let i = 0; i < opcode.arity; i++) {
            args.push(stack.pop());
        }

        if (opcode.name === 'jump') {
            return {bytecode, stack, position: importObj.jump(...args, stack)};
        }
        if (opcode.name === 'jumpi') {
            return {bytecode, stack, position: importObj.jumpi(...args, stack) || position};
        }
        if (opcode.name === 'pop') {
            return {bytecode, stack: importObj.pop(stack), position};
        }

        const result = await importObj[opcode.name](...args, stack);

        if (result === ERROR.STOP) return {bytecode, stack, position: 0};
        if (result) stack.push(toBN(result));

        return {bytecode, stack, position};
    }
    else if (0x60 <= code && code < 0x80) return importObj.handlePush(code, bytecode, position, stack);
    else if (0x80 <= code && code < 0x90) return {bytecode, stack: importObj.handleDup(code, stack), position};
    else if (0x90 <= code && code < 0xa0) return {bytecode, stack: importObj.handleSwap(code, stack), position};

    throw new Error(`Invalid opcode ${hexcode}; ${typeof hexcode} - ${JSON.stringify(opcode)}`);
}

const opcodes = {
    '00': {name: 'stop', arity: 0},
    '01': {name: 'add', arity: 2},
    '02': {name: 'mul', arity: 2},
    '03': {name: 'sub', arity: 2},
    '04': {name: 'div', arity: 2},
    '05': {name: 'sdiv', arity: 2},
    '06': {name: 'mod', arity: 2},
    '07': {name: 'smod', arity: 2},
    '08': {name: 'addmod', arity: 3},
    '09': {name: 'mulmod', arity: 3},
    '0a': {name: 'exp', arity: 2},
    '0b': {name: 'signextend', arity: 2},

    '10': {name: 'lt', arity: 2},
    '11': {name: 'gt', arity: 2},
    '12': {name: 'slt', arity: 2},
    '13': {name: 'sgt', arity: 2},
    '14': {name: 'eq', arity: 2},
    '15': {name: 'iszero', arity: 1},
    '16': {name: 'and', arity: 2},
    '17': {name: 'or', arity: 2},
    '18': {name: 'xor', arity: 2},
    '19': {name: 'not', arity: 1},
    '1a': {name: 'byte', arity: 2},
    '1b': {name: 'shl', arity: 2},
    '1c': {name: 'shr', arity: 2},
    '1d': {name: 'sar', arity: 2},

    '20': {name: 'keccak256', arity: 1},

    '30': {name: 'getAddress', arity: 0},
    '31': {name: 'getExternalBalance', arity: 1},
    '32': {name: 'getTxOrigin', arity: 0},
    '33': {name: 'getCaller', arity: 0},
    '34': {name: 'getCallValue', arity: 0},
    '35': {name: 'callDataLoad', arity: 1},
    '36': {name: 'getCallDataSize', arity: 0},
    '37': {name: 'callDataCopy', arity: 3},
    '38': {name: 'getCodeSize', arity: 0},
    '39': {name: 'codeCopy', arity: 3},
    '3a': {name: 'getTxGasPrice', arity: 0},
    '3b': {name: 'getExternalCodeSize', arity: 1},
    '3c': {name: 'externalCodeCopy', arity: 4},
    '3d': {name: 'getReturnDataSize', arity: 0},
    '3e': {name: 'returnDataCopy', arity: 3},
    '3f': {name: 'getExternalCodeHash', arity: 1},

    '40': {name: 'getBlockHash', arity: 1},
    '41': {name: 'getBlockCoinbase', arity: 0},
    '42': {name: 'getBlockTimestamp', arity: 0},
    '43': {name: 'getBlockNumber', arity: 0},
    '44': {name: 'getBlockDifficulty', arity: 0},
    '45': {name: 'getBlockGasLimit', arity: 0},
    '46': {name: 'getBlockChainId', arity: 0},
    '47': {name: 'getSelfBalance', arity: 0},

    '50': {name: 'pop', arity: 0},
    '51': {name: 'loadMemory', arity: 1},
    '52': {name: 'storeMemory', arity: 2},
    '53': {name: 'storeMemory8', arity: 2},
    '54': {name: 'storageLoad', arity: 1},
    '55': {name: 'storageStore', arity: 2},
    '56': {name: 'jump', arity: 1},
    '57': {name: 'jumpi', arity: 2},
    '58': {name: 'pc', arity: 0},
    '59': {name: 'getMSize', arity: 0},
    '5a': {name: 'getGasLeft', arity: 0},
    '5b': {name: 'jumpdest', arity: 0},

    'a0': {name: 'log0', arity: 2},
    'a1': {name: 'log1', arity: 3},
    'a2': {name: 'log2', arity: 4},
    'a3': {name: 'log3', arity: 5},
    'a4': {name: 'log4', arity: 6},

    'f0': {name: 'create', arity: 3},
    'f1': {name: 'call', arity: 7},
    'f2': {name: 'callCode', arity: 7},
    'f3': {name: 'return', arity: 2},
    'f4': {name: 'callDelegate', arity: 6},
    'f5': {name: 'create2', arity: 3},
    'fa': {name: 'callStatic', arity: 6},
    'fd': {name: 'revert', arity: 2},
    'fe': {name: 'invalid', arity: 0},
    'ff': {name: 'selfDestruct', arity: 1},
}

module.exports = {initializeImports, instantiateModule};
