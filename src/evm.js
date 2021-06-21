const BN = require('bn.js');
const {
    hexToUint8Array,
    toBN,
    BN2hex,
    BN2uint8arr,
    keccak256,
}  = require('./utils.js');

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
        storeMemory: function (offset, bytes, {stack, position}) {
            const value = BN2uint8arr(bytes);
            jsvm_env.storeMemory(value, offset);
            const changed = {memory: [offset.toNumber(), value, 1]}
            logger.debug('MSTORE', [bytes, offset], [], getCache(), stack, changed);
            return;
        },
        storeMemory8: function (offset, bytes, {stack, position}){
            const value = BN2uint8arr(bytes);
            jsvm_env.storeMemory8(value, offset);
            const changed = {memory: [offset.toNumber(), value, 1]}
            logger.debug('MSTORE8', [bytes, offset], [], getCache(), stack, changed);
            return;
        },
        loadMemory: function (offset, {stack, position}){
            const result = toBN(jsvm_env.loadMemory(offset));
            stack.push(result);
            const changed = {memory: [offset.toNumber(), BN2hex(result), 0]}
            logger.debug('MLOAD', [offset], [result], getCache(), stack, changed);
            return {stack, position};
        },
        useGas: function (amount, {stack}){
            jsvm_env.useGas(amount);
            logger.debug('USEGAS', [amount], [], getCache(), stack);
            return;
        },
        getAddress: function ({stack, position}) {
            const address = toBN(jsvm_env.getAddress());
            stack.push(address);
            logger.debug('ADDRESS', [], [address], getCache(), stack);
            return {stack, position};
        },
        // result is u128
        getExternalBalance: function (_address, {stack, position}){
            const address = BN2uint8arr(_address);
            const balance = toBN(jsvm_env.getExternalBalance(address));
            stack.push(balance);
            logger.debug('BALANCE', [_address], [balance], getCache(), stack);
            return {stack, position};
        },
        // result i32 Returns 0 on success and 1 on failure
        getBlockHash: function (number, {stack, position}){
            const hash = toBN(jsvm_env.getBlockHash(number));
            stack.push(hash);
            logger.debug('BLOCKHASH', [number], [hash], getCache(), stack);
            return {stack, position};
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
            {stack, position}
        ) {
            const result = toBN(jsvm_env.call(
                gas_limit,
                BN2uint8arr(address),
                BN2uint8arr(value),
                dataOffset,
                dataLength,
                outputOffset,
                outputLength,
            ));
            stack.push(result);
            logger.debug('CALL', [gas_limit,
                address,
                value,
                dataOffset,
                dataLength,
                outputOffset,
                outputLength,], [result], getCache(), stack);
            return {stack, position};
        },
        callDataCopy: function (resultOffset, dataOffset, length, {stack, position}){
            const result = jsvm_env.callDataCopy(resultOffset, dataOffset, length);
            logger.debug('CALLDATACOPY', [resultOffset, dataOffset, length], [result], getCache(), stack);
            return;
        },
        getCallDataSize: function ({stack, position}) {
            const result = toBN(jsvm_env.getCallDataSize());
            stack.push(result);
            logger.debug('CALLDATASIZE', [], [result], getCache(), stack);
            return {stack, position};
        },
        callDataLoad: function(dataOffset, {stack, position}) {
            const result = toBN(jsvm_env.callDataLoad(dataOffset));
            stack.push(result);
            logger.debug('CALLDATALOAD', [dataOffset], [result], getCache(), stack);
            return {stack, position};
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
            {stack, position}
        ) {
            const result = toBN(jsvm_env.callCode(
                gas_limit,
                BN2uint8arr(address),
                BN2uint8arr(value),
                dataOffset,
                dataLength,
                outputOffset,
                outputLength
            ));
            stack.push(result);
            logger.debug('CALLCODE', [gas_limit_i64, addressOffset_i32ptr_address, valueOffset_i32ptr_u128, dataOffset_i32ptr_bytes, dataLength_i32], [result], getCache(), stack);
            return {stack, position};
        },
        // result i32 Returns 0 on success, 1 on failure and 2 on revert
        callDelegate: function (
            gas_limit_i64,
            address,
            dataOffset,
            dataLength,
            outputOffset,
            outputLength,
            {stack, position}
        ) {
            const result = toBN(jsvm_env.callDelegate(
                gas_limit_i64,
                BN2uint8arr(address),
                dataOffset,
                dataLength,
                outputOffset,
                outputLength
            ));
            stack.push(result);
            logger.debug('DELEGATECALL', [
                gas_limit_i64,
                address,
                dataOffset,
                dataLength,
                outputOffset,
                outputLength], [result], getCache(), stack
            );
            return {stack, position};
        },
        // result Returns 0 on success, 1 on failure and 2 on revert
        callStatic: function (
            gas_limit_i64,
            address,
            dataOffset,
            dataLength,
            outputOffset,
            outputLength,
            {stack, position}
        ) {
            const result = toBN(jsvm_env.callStatic(
                gas_limit_i64,
                BN2uint8arr(address),
                dataOffset,
                dataLength,
                outputOffset,
                outputLength
            ));
            stack.push(result);
            logger.debug('STATICCALL', [
                gas_limit_i64,
                address,
                dataOffset,
                dataLength,
                outputOffset,
                outputLength], [result], getCache(), stack);
            return {stack, position};
        },
        storageStore: function (pathOffset, value, {stack, position}){
            jsvm_env.storageStore(BN2uint8arr(pathOffset), BN2uint8arr(value));
            const changed = {storage: [BN2hex(pathOffset), BN2hex(value), 1]}
            logger.debug('SSTORE', [pathOffset, value], [], getCache(), stack, changed);
            return;
        },
        storageLoad: function (pathOffset, {stack, position}){
            const result = toBN(jsvm_env.storageLoad(BN2uint8arr(pathOffset)));
            stack.push(result);
            const changed = {storage: [BN2hex(pathOffset), BN2hex(result), 0]}
            logger.debug('SLOAD', [pathOffset], [result], getCache(), stack, changed);
            return {stack, position};
        },
        getCaller: function ({stack, position}) {
            const address = toBN(jsvm_env.getCaller());
            stack.push(address);
            logger.debug('CALLER', [], [address], getCache(), stack);
            return {stack, position};
        },
        getCallValue: function ({stack, position}) {
            const value = toBN(jsvm_env.getCallValue());
            stack.push(value);
            logger.debug('CALLVALUE', [], [value], getCache(), stack);
            return {stack, position};
        },
        codeCopy: function (resultOffset, codeOffset, length, {stack, position}) {
            jsvm_env.codeCopy(resultOffset, codeOffset, length);
            logger.debug('CODECOPY', [resultOffset, codeOffset, length], [], getCache(), stack);
            return;
        },
        // returns i32 - code size current env
        getCodeSize: function({stack, position}) {
            const result = toBN(jsvm_env.getCodeSize());
            stack.push(result);
            logger.debug('CODESIZE', [], [result], getCache(), stack);
            return {stack, position};
        },
        // block’s beneficiary address
        getBlockCoinbase: function({stack, position}) {
            const value = toBN(jsvm_env.getBlockCoinbase());
            stack.push(value);
            logger.debug('COINBASE', [], [value], getCache(), stack);
            return {stack, position};
        },
        create: function (
            value,
            dataOffset,
            dataLength,
            {stack, position}
        ) {
            const address = toBN(jsvm_env.create(value, dataOffset, dataLength));
            stack.push(address);
            logger.debug('CREATE', [value,
                dataOffset,
                dataLength,
            ], [address], getCache(), stack);
            return {stack, position};
        },
        getBlockDifficulty: function ({stack, position}) {
            const value = toBN(jsvm_env.getBlockDifficulty());
            stack.push(value);
            logger.debug('DIFFICULTY', [], [value], getCache(), stack);
            return {stack, position};
        },
        externalCodeCopy: function (
            address,
            resultOffset,
            codeOffset,
            dataLength,
            {stack, position}
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
            ], [], getCache(), stack);
            return;
        },
        // Returns extCodeSize i32
        getExternalCodeSize: function (address, {stack, position}){
            const result = toBN(jsvm_env.getExternalCodeSize(BN2uint8arr(address)));
            stack.push(result);
            logger.debug('EXTCODESIZE', [address], [result], getCache(), stack);
            return {stack, position};
        },
        // result gasLeft i64
        getGasLeft: function ({stack, position}) {
            const result = toBN(jsvm_env.getGasLeft());
            stack.push(result);
            logger.debug('GAS', [], [result], getCache(), stack);
            return {stack, position};
        },
        // result blockGasLimit i64
        getBlockGasLimit: function ({stack, position}) {
            const result = toBN(jsvm_env.getBlockGasLimit());
            stack.push(result);
            logger.debug('GASLIMIT', [], [result], getCache(), stack);
            return {stack, position};
        },
        getTxGasPrice: function ({stack, position}) {
            const result = toBN(jsvm_env.getTxGasPrice());
            stack.push(result);
            logger.debug('GASPRICE', [], [result], getCache(), stack);
            return {stack, position};
        },
        log: function (
            dataOffset,
            dataLength,
            ...topics
        ) {
            const {stack, position} = topics.pop();
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
            ], [], getCache(), stack);
            return;
        },
        log0: function(dataOffset, dataLength, ...topics) {
            return api.ethereum.log(dataOffset, dataLength, ...topics);
        },
        log1: function(dataOffset, dataLength, ...topics) {
            return api.ethereum.log(dataOffset, dataLength, ...topics);
        },
        log2: function(dataOffset, dataLength, ...topics) {
            return api.ethereum.log(dataOffset, dataLength, ...topics);
        },
        log3: function(dataOffset, dataLength, ...topics) {
            return api.ethereum.log(dataOffset, dataLength, ...topics);
        },
        log4: function(dataOffset, dataLength, ...topics) {
            return api.ethereum.log(dataOffset, dataLength, ...topics);
        },
        // result blockNumber i64
        getBlockNumber: function ({stack, position}) {
            const result = toBN(jsvm_env.getBlockNumber());
            stack.push(result);
            logger.debug('NUMBER', [], [result], getCache(), stack);
            return {stack, position};
        },
        getTxOrigin: function ({stack, position}) {
            const address = toBN(jsvm_env.getTxOrigin());
            stack.push(address);
            logger.debug('ORIGIN', [], [address], getCache(), stack);
            return {stack, position};
        },
        finish: function (dataOffset, dataLength, {stack, position}){
            const res = jsvm_env.finish(dataOffset, dataLength);
            logger.debug('FINISH', [dataOffset, dataLength], [res], getCache(), stack);
            finishAction(res);
            return {stack, position: 0};
        },
        revert: function (dataOffset, dataLength, {stack, position}){
            const res = jsvm_env.revert(dataOffset, dataLength);
            console.log('revert');
            logger.debug('REVERT', [dataOffset, dataLength], [res], getCache(), stack);
            revertAction(res);
            return {stack, position: 0};
        },
        // result dataSize i32
        getReturnDataSize: function ({stack, position}) {
            const result = toBN(jsvm_env.getReturnDataSize());
            stack.push(result);
            logger.debug('RETURNDATASIZE', [], [result], getCache(), stack);
            return {stack, position};
        },
        returnDataCopy: function (resultOffset, dataOffset, length, {stack, position}){
            jsvm_env.returnDataCopy(resultOffset, dataOffset, length);
            logger.debug('RETURNDATACOPY', [resultOffset, dataOffset, length], [], getCache(), stack);
            return;
        },
        selfDestruct: function (address, {stack, position}){
            jsvm_env.selfDestruct(BN2uint8arr(address));
            logger.debug('SELFDESTRUCT', [address], [], getCache(), stack);
            finishAction();
            return {stack, position: 0};
        },
        getBlockTimestamp: function ({stack, position}) {
            const result = toBN(jsvm_env.getBlockTimestamp());
            stack.push(result);
            logger.debug('TIMESTAMP', [], [result], getCache(), stack);
            return {stack, position};
        },
        return: (offset, length, {stack, position}) => {
            const result = jsvm_env.finish(offset, length);
            logger.debug('RETURN', [offset, length], [result], getCache(), stack);
            finishAction(result);
            return {stack, position: 0};
        },
        revert: (offset, length, {stack, position}) => {
            const result = jsvm_env.revert(offset, length);
            logger.debug('REVERT', [offset, length], [result], getCache(), stack);
            revertAction(result);
            return {stack, position: 0};
        },
        stop: ({stack, position}) => {
            return api.ethereum.return(toBN(0), toBN(0), stack);
        },
        keccak256: (offset, length, {stack, position}) => {
            const slots = Math.ceil(length.toNumber() / 32);
            const data = [...new Array(slots).keys()].map(index => {
                const delta = toBN(index * 32);
                return jsvm_env.loadMemory(offset.add(delta));
            }).reduce((accum, value) => {
                return new Uint8Array([...accum, ...value]);
            }, []);
            const hash = keccak256(data);
            const result = toBN(hash);
            stack.push(result);
            logger.debug('keccak256', [offset, length], [result], getCache(), stack);
            return {stack, position: 0};
        },
        uint256Max: () => new BN('10000000000000000000000000000000000000000000000000000000000000000', 16),
        // mimick evm overflow
        add: (a, b, {stack, position}) => {
            const result = a.add(b).mod(api.ethereum.uint256Max());
            stack.push(result);
            logger.debug('ADD', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        mul: (a, b, {stack, position}) => {
            const result = a.mul(b).mod(api.ethereum.uint256Max());
            stack.push(result);
            logger.debug('MUL', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        // mimick evm underflow
        sub: (a, b, {stack, position}) => {
            const result = a.sub(b).mod(api.ethereum.uint256Max());
            stack.push(result);
            logger.debug('SUB', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        div: (a, b, {stack, position}) => {
            const result = a.abs().div(b.abs());
            stack.push(result);
            logger.debug('DIV', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        sdiv: (a, b, {stack, position}) => {
            const result = a.div(b);
            stack.push(result);
            logger.debug('SDIV', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        mod: (a, b, {stack, position}) => {
            const result = a.abs().mod(b.abs());
            stack.push(result);
            logger.debug('MOD', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        smod: (a, b, {stack, position}) => {
            const result = a.mod(b);
            stack.push(result);
            logger.debug('SMOD', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        addmod: (a, b, c, {stack, position}) => {
            const result = api.ethereum.mod(api.ethereum.add(a, b), c);
            stack.push(result);
            logger.debug('ADDMOD', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        mulmod: (a, b, c, {stack, position}) => {
            const result = api.ethereum.mod(api.ethereum.mul(a, b), c);
            stack.push(result);
            logger.debug('MULMOD', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        exp: (a, b, {stack, position}) => {
            if (b.lt(toBN(0))) return toBN(0);
            const result = a.pow(b);
            stack.push(result);
            logger.debug('EXP', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        signextend: (size, value, {stack, position}) => {
            const result = value;
            stack.push(result);
            logger.debug('SIGNEXTEND', [size, value], [result], getCache(), stack);
            return {stack, position};
        },
        lt: (a, b, {stack, position}) => {
            let result = a.abs().lt(b.abs());
            result = toBN(result ? 1 : 0);
            stack.push(result);
            logger.debug('LT', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        gt: (a, b, {stack, position}) => {
            let result = a.abs().gt(b.abs());
            result = toBN(result ? 1 : 0);
            stack.push(result);
            logger.debug('GT', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        slt: (a, b, {stack, position}) => {
            let result = a.lt(b);
            result = toBN(result ? 1 : 0);
            stack.push(result);
            logger.debug('SLT', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        sgt: (a, b, {stack, position}) => {
            let result = a.gt(b);
            result = toBN(result ? 1 : 0);
            stack.push(result);
            logger.debug('SGT', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        eq: (a, b, {stack, position}) => {
            let result = a.eq(b);
            result = toBN(result ? 1 : 0);
            stack.push(result);
            logger.debug('EQ', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        iszero: (a, {stack, position}) => {
            let result = a.isZero();
            result = toBN(result ? 1 : 0);
            stack.push(result);
            logger.debug('SAR', [a], [result], getCache(), stack);
            return {stack, position};
        },
        and: (a, b, {stack, position}) => {
            const result = a.and(b);
            stack.push(result);
            logger.debug('AND', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        or: (a, b, {stack, position}) => {
            const result = a.or(b);
            stack.push(result);
            logger.debug('OR', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        xor: (a, b, {stack, position}) => {
            const result = a.xor(b);
            stack.push(result);
            logger.debug('XOR', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        not: (a, {stack, position}) => {
            const result = a.notn(256);
            stack.push(result);
            logger.debug('NOT', [a], [result], getCache(), stack);
            return {stack, position};
        },
        byte: (nth, bb, {stack, position}) => {
            const result = toBN(BN2uint8arr(bb).slice(nth, nth + 1));
            stack.push(result);
            logger.debug('BYTE', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        shl: (a, b, {stack, position}) => {
            const result = b.shln(a.toNumber());
            stack.push(result);
            logger.debug('SHL', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        shr: (a, b, {stack, position}) => {
            const result = b.shrn(a.toNumber());
            stack.push(result);
            logger.debug('SHR', [a, b], [result], getCache(), stack);
            return {stack, position};
        },
        sar: (nobits, value, {stack, position}) => {
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
            stack.push(result);
            logger.debug('SAR', [nobits, value], [result], getCache(), stack);
            return {stack, position};
        },
        handlePush: (code, bytecode, {stack, position}) => {
            const no = code - 0x60 + 1;
            const value = toBN(bytecode.slice(position, position + no));
            stack.push(value);
            position += no;

            logger.debug('PUSH' + no + ' 0x' + value.toString(16).padStart(no, '0'), [value], [], getCache(), stack);
            return {stack, position};
        },
        handleSwap: (code, {stack, position}) => {
            const no = code - 0x90 + 1;
            if (no >= stack.length) throw new Error(`Invalid SWAP${no} ; stack: ${stack}`);
            const last = stack.pop();
            const spliced = stack.splice(stack.length - no, 1, last);
            stack.push(spliced[0]);

            logger.debug('SWAP' + no, [], [], getCache(), stack);
            return {stack, position};
        },
        handleDup: (code, {stack, position}) => {
            const no = code - 0x80 + 1;
            if (no > stack.length) throw new Error(`Invalid DUP${no} ; stack: ${stack}`);
            const value = stack[stack.length - no];
            stack.push(value);

            logger.debug('DUP' + no, [], [], getCache(), stack);
            return {stack, position};
        },
        jump: (newpos, {stack}) => {
            if (!newpos && newpos !== 0) throw new Error(`Invalid JUMP ${newpos}`);
            newpos = newpos.toNumber();
            logger.debug('JUMP', [newpos], [], getCache(), stack);
            return {stack, position: newpos};
        },
        jumpi: (newpos, condition, {stack, position}) => {
            newpos = newpos.toNumber();
            if (condition.toNumber() === 1) position = newpos;
            logger.debug('JUMPI', [condition, newpos], [], getCache(), stack);
            return {stack, position};
        },
        jumpdest:({stack}) => {
            logger.debug('JUMPDEST', [], [], getCache(), stack);
        },
        pop: ({stack, position}) => {
            stack.pop();
            logger.debug('POP', [], [], getCache(), stack);
            return {stack, position};
        },
    }

    return api;
}

const instantiateModule = (bytecode, importObj) => {
    if (!bytecode) throw new Error('No bytecode found');
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
    let obj;

    if (opcode && importObj[opcode.name]) {
        const args = [];
        for (let i = 0; i < opcode.arity; i++) {
            args.push(stack.pop());
        }

        switch(opcode.name) {
            case 'jump':
                obj = importObj.jump(...args, {stack, position});
                break;
            case 'jumpi':
                obj = importObj.jumpi(...args, {stack, position});
                break;
            case 'pop':
                obj = importObj.pop({stack, position});
                break;
            default:
                obj = await importObj[opcode.name](...args, {stack, position});
        }
    }
    else if (0x60 <= code && code < 0x80) {
        obj = importObj.handlePush(code, bytecode, {stack, position});
    }
    else if (0x80 <= code && code < 0x90) {
        obj = importObj.handleDup(code, {stack, position});
    }
    else if (0x90 <= code && code < 0xa0) {
        obj = importObj.handleSwap(code, {stack, position});
    }
    else {
        throw new Error(`Invalid opcode ${hexcode}; ${typeof hexcode} - ${JSON.stringify(opcode)}`);
    }

    if (obj) {
        stack = typeof obj.stack !== 'undefined' ? obj.stack : stack;
        position = typeof obj.position !== 'undefined' ? obj.position : position;
    }

    return {bytecode, stack, position};
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

    '20': {name: 'keccak256', arity: 2},

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
