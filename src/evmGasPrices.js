const {divCeil, toBN, BN2uint8arr} = require('./utils');
const {ERROR} = require('./constants');
const coefs = {
    'quadCoeffDiv': {
        "v": 512,
        "d": "Divisor for the quadratic particle of the memory cost equation"
    },
    "txDataNonZero": {
        "v": 16,
        "d": "Per byte of data attached to a transaction that is not equal to zero. NOTE: Not payable on data of calls between transactions"
    },
    "sstoreSentryGasEIP2200": {
        "v": 2300,
        "d": "Minimum gas required to be present for an SSTORE call, not consumed"
    },
    "sstoreNoopGasEIP2200": {
      "v": 800,
      "d": "Once per SSTORE operation if the value doesn't change"
    },
    "sstoreDirtyGasEIP2200": {
      "v": 800,
      "d": "Once per SSTORE operation if a dirty value is changed"
    },
    "sstoreInitGasEIP2200": {
      "v": 20000,
      "d": "Once per SSTORE operation from clean zero to non-zero"
    },
    "sstoreInitRefundEIP2200": {
      "v": 19200,
      "d": "Once per SSTORE operation for resetting to the original zero value"
    },
    "sstoreCleanGasEIP2200": {
      "v": 5000,
      "d": "Once per SSTORE operation from clean non-zero to something else"
    },
    "sstoreCleanRefundEIP2200": {
      "v": 4200,
      "d": "Once per SSTORE operation for resetting to the original non-zero value"
    },
    "sstoreClearRefundEIP2200": {
      "v": 15000,
      "d": "Once per SSTORE operation for clearing an originally existing storage slot"
    },
}
const _gasPrices = [
    ['Gzero',0,' Nothing paid for operations of the set Wzero.'],
    ['Gjumpdest',1,' Amount of gas to pay for a JUMPDEST operation.'],
    ['Gbase',2,' Amount of gas to pay for operations of the set Wbase.'],
    ['Gverylow',3,' Amount of gas to pay for operations of the set Wverylow.'],
    ['Glow',5,' Amount of gas to pay for operations of the set Wlow.'],
    ['Gmid',8,' Amount of gas to pay for operations of the set Wmid.'],
    ['Ghigh',10,' Amount of gas to pay for operations of the set Whigh.'],
    ['Gextcode',700,' Amount of gas to pay for operations of the set Wextcode.'],
    ['Gbalance',700,' Amount of gas to pay for a BALANCE operation.'],
    ['Gsload',800,' Paid for an SLOAD operation.'],
    ['Gsset',20000,' Paid for an SSTORE operation when the storage value is set to non-zero from zero.'],
    ['Gsreset',5000,' Paid for an SSTORE operation when the storage value’s zeroness remains unchanged or is set to zero.'],
    ['Rsclear',15000,' Refund given (added into refund counter) when the storage value is set to zero from non-zero.'],
    ['Rselfdestruct',24000,' Refund given (added into refund counter) for self-destructing an account.'],
    ['Gselfdestruct',5000,' Amount of gas to pay for a SELFDESTRUCT operation.'],
    ['Gcreate',32000,' Paid for a CREATE operation.'],
    ['Gcodedeposit',200,' Paid per byte for a CREATE operation to succeed in placing code into state.'],
    ['Gcall',700,' Paid for a CALL operation.'],
    ['Gcallvalue',9000,' Paid for a non-zero value transfer as part of the CALL operation.'],
    ['Gcallstipend',2300,' A stipend for the called contract subtracted from Gcallvalue for a non-zero value transfer.'],
    ['Gnewaccount',25000,' Paid for a CALL or SELFDESTRUCT operation which creates an account.'],
    ['Gexp',10,' Partial payment for an EXP operation.'],
    ['Gexpbyte',50,' Partial payment when multiplied by the number of bytes in the exponent for the EXP operation.'],
    ['Gmemory',3,' Paid for every additional word when expanding memory.'],
    ['Gtxcreate',32000,' Paid by all contract-creating transactions after the Homestead transition.'],
    ['Gtxdatazero',4,' Paid for every zero byte of data or code for a transaction.'],
    ['Gtxdatanonzero',16,' Paid for every non-zero byte of data or code for a transaction.'],
    ['Gtransaction',21000,' Paid for every transaction.'],
    ['Glog',375,' Partial payment for a LOG operation.'],
    ['Glogdata',8,' Paid for each byte in a LOG operation’s data.'],
    ['Glogtopic',375,' Paid for each topic of a LOG operation.'],
    ['Gsha3',30,' Paid for each SHA3 operation.'],
    ['Gsha3word',6,' Paid for each word (rounded up) for input data to a SHA3 operation.'],
    ['Gcopy',3,' Partial payment for *COPY operations multiplied by words copied rounded up.'],
    ['Gblockhash',20,' Payment for BLOCKHASH operation.'],
    ['Gquaddivisor',20,' The quadratic coefficient of the input sizes of the exponentiation-over-modulo precompiled contract'],
]

const _opcodeCategories = {
    'Gzero': ['STOP', 'RETURN', 'REVERT'],
    'Gbase': ['ADDRESS', 'ORIGIN', 'CALLER', 'CALLVALUE', 'CALLDATASIZE', 'CODESIZE', 'GASPRICE', 'COINBASE', 'TIMESTAMP', 'NUMBER', 'DIFFICULTY', 'GASLIMIT', 'CHAINID', 'RETURNDATASIZE', 'POP', 'PC', 'MSIZE', 'GAS'],
    'Gverylow': ['ADD', 'SUB', 'NOT', 'LT', 'GT', 'SLT', 'SGT', 'EQ', 'ISZERO', 'AND', 'OR', 'XOR', 'BYTE', 'SHL', 'SHR', 'SAR', 'CALLDATALOAD', 'MLOAD', 'MSTORE', 'MSTORE8', 'PUSH', 'DUP', 'SWAP'],
    'Glow': ['MUL', 'DIV', 'SDIV', 'MOD', 'SMOD', 'SIGNEXTEND', 'SELFBALANCE'],
    'Gmid': ['ADDMOD', 'MULMOD', 'JUMP'],
    'Ghigh': ['JUMPI'],
    'Gcopy': ['CALLDATACOPY', 'CODECOPY', 'RETURNDATACOPY'],
    'Gcall': ['CALL', 'CALLCODE', 'DELEGATECALL', 'STATICCALL'],
    'Gextcode': ['EXTCODESIZE', 'EXTCODEHASH'],
}

const gasPrices = {};
const opcodeCategories = {};
_gasPrices.forEach(v => {
    gasPrices[v[0]] = {value: v[1], description: v[2]};
});

Object.keys(_opcodeCategories).forEach(key => {
    _opcodeCategories[key].forEach(v => {
        opcodeCategories[v.toLowerCase()] = key;
    })
});

function getPrice (name, options) {
    let price = 0;
    const stripped = name.replace(/\d/g, '');
    const category = opcodeCategories[name] || opcodeCategories[stripped];
    if (special[name]) return special[name](options, category);
    else if (category) price += gasPrices[category].value;
    else if (gasPrices['G'+name]) price += gasPrices['G'+name].value;
    return price;
}

const special = {
    extcodesize: () => {
        let baseFee = toBN(gasPrices.Gextcode.value);
        return {baseFee};
    },
    balance: ({} = {}) => {
        let baseFee = toBN(gasPrices.Gbalance.value);
        return {baseFee};
    },
    sload: () => {
        let baseFee = toBN(gasPrices.Gsload.value);
        return {baseFee};
    },
    exp: ({exponent}) => {
        let baseFee = toBN(gasPrices.Gexp.value);
        const byteLength = exponent.byteLength();
        if (byteLength < 1 || byteLength > 32) {
            throw new Error(ERROR.OUT_OF_RANGE);
        }
        const addl = toBN(byteLength).muln(gasPrices.Gexpbyte.value);
        return {baseFee, addl};
    },
    sstore: ({count, value, currentValue, origValue, gasLeft}) => {
        const baseFee = 0;
        let addl = 0, refund = 0;
        // If gasleft is less than or equal to gas stipend, fail the current call frame with ‘out of gas’ exception.
        if (gasLeft.ltn(coefs.sstoreSentryGasEIP2200.v)) throw new Error(ERROR.OUT_OF_GAS);

        // If current value equals new value (this is a no-op), SLOAD_GAS is deducted.
        if (value.eq(currentValue)) return {baseFee, addl: gasPrices.Gsload.value};

        // If current value does not equal new value

        // If original value equals current value
        if (origValue.eq(currentValue)) {
            if (origValue.eqn(0)) {
                return {baseFee, addl: gasPrices.Gsset.value};
            }
            addl += gasPrices.Gsreset.value;
            if (value.eqn(0)) refund += gasPrices.Gsreset.value;
            return {baseFee, addl, refund};
        }
        // If original value does not equal current value
        addl += gasPrices.Gsload.value;

        if (!origValue.eqn(0)) {
            // remove refund that was previously awarded
            if (currentValue.eq(0)) refund -= gasPrices.Gsreset.value;
            if (value.eqn(0)) refund += gasPrices.Gsreset.value;
        }
        if (origValue.eq(value)) {
            if (origValue.eqn(0)) refund += gasPrices.Gsset.value - gasPrices.Gsload.value;
            else refund += gasPrices.Gsreset.value - gasPrices.Gsload.value;
        }

        return {baseFee, addl, refund};
    },
    mstore: ({offset, length, memWordCount, highestMemCost}) => {
        let baseFee = toBN(gasPrices.Gverylow.value);
        const changed = subMemUsage({offset, length, memWordCount, highestMemCost});
        changed.baseFee = baseFee;
        return changed;
    },
    calldatacopy: ({offset, length, memWordCount, highestMemCost}) => {
        const changed = subMemUsage({offset, length, memWordCount, highestMemCost});
        changed.baseFee = toBN(gasPrices.Gverylow.value);

        if (!length.eqn(0)) {
            addl = toBN(gasPrices.Gcopy.value).imul(divCeil(length, toBN(32)));
            changed.addl = changed.addl.add(addl);
        }
        return changed;
    },
    codecopy: ({offset, length, memWordCount, highestMemCost}) => {
        const changed = subMemUsage({offset, length, memWordCount, highestMemCost});
        changed.baseFee = toBN(gasPrices.Gverylow.value);

        if (!length.eqn(0)) {
            addl = toBN(gasPrices.Gcopy.value).imul(divCeil(length, toBN(32)));
            changed.addl = changed.addl.add(addl);
        }
        return changed;
    },
    returndatacopy: ({offset, length, memWordCount, highestMemCost}) => {
        const changed = subMemUsage({offset, length, memWordCount, highestMemCost});
        changed.baseFee = toBN(gasPrices.Gverylow.value);

        if (!length.eqn(0)) {
            addl = toBN(gasPrices.Gcopy.value).imul(divCeil(length, toBN(32)));
            changed.addl = changed.addl.add(addl);
        }
        return changed;
    },
    extcodecopy: ({offset, length, memWordCount, highestMemCost}) => {
        const changed = subMemUsage({offset, length, memWordCount, highestMemCost});
        changed.baseFee = toBN(gasPrices.Gextcode.value);

        if (!length.eqn(0)) {
            addl = toBN(gasPrices.Gcopy.value).imul(divCeil(length, toBN(32)));
            changed.addl = changed.addl.add(addl);
        }
        return changed;
    },
    keccak256: ({length}) => {
        const baseFee = toBN(gasPrices.Gsha3.value);
        let addl = toBN(gasPrices.Gsha3word.value).mul(divCeil(length, toBN(32)));
        return {baseFee, addl};
    },
    log: ({length, topics}) => {
        // log + logdata * bytesLength + logtopic * topics
        const baseFee = toBN(gasPrices.Glog.value);
        const addl = length.muln(gasPrices.Glogdata.value).add(
            topics.muln(gasPrices.Glogtopic.value)
        );
        return {baseFee, addl};
    },
    create: ({length}) => {
        const baseFee = toBN(gasPrices.Gcreate.value);
        const addl = length.muln(gasPrices.Gcodedeposit.value);
        return {baseFee, addl};
    },
    call: ({value}) => {
        const baseFee = toBN(gasPrices.Gcall.value);
        let addl = toBN(0);
        if (!value.eqn(0)) addl = addl.addn(gasPrices.Gcallvalue.value);
        return {baseFee, addl};
    },
    callcode: ({value}) => {
        const baseFee = toBN(gasPrices.Gcall.value);
        let addl = toBN(0);
        if (!value.eqn(0)) addl = addl.addn(gasPrices.Gcallvalue.value);
        return {baseFee, addl};
    },
    staticcall: () => {
        const baseFee = toBN(gasPrices.Gcall.value);
        return {baseFee};
    },
    delegatecall: () => {
        const baseFee = toBN(gasPrices.Gcall.value);
        return {baseFee};
    },
}

function subMemUsage ({offset, length, memWordCount, highestMemCost}) {
    // YP (225): access with zero length will not extend the memory
    if (length.isZero()) return {baseFee: toBN(0), addl: toBN(0)};

    const wordFee = toBN(gasPrices.Gmemory.value);
    const newMemoryWordCount = divCeil(offset.add(length), toBN(32))

    if (newMemoryWordCount.lte(memWordCount)) return {baseFee: toBN(0), addl: toBN(0)};

    const changes = {};
    const words = newMemoryWordCount;
    const quadCoeff = toBN(coefs.quadCoeffDiv.v);
    // words * 3 + words ^2 / 512
    const subMemUsage = words.mul(wordFee).add(words.mul(words).div(quadCoeff));

    if (subMemUsage.gt(highestMemCost)) {
        changes.addl = subMemUsage.sub(highestMemCost);
        changes.highestMemCost = subMemUsage;
    }
    changes.memoryWordCount = newMemoryWordCount;
    return changes;
}

module.exports = {
    gasPrices,
    opcodeCategories,
    getPrice,
}
