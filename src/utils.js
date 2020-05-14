const isNode = typeof process !== 'undefined'
    && process.versions != null
    && process.versions.node != null;

const sizeMap = {
    address: 20,
    uint16: 16,
    uint8: 8,
    uint32: 32,
    bytes32: 32,
}
const typeDecode = {
    address: uint8arr => '0x' + uint8ArrayToHex(uint8arr).substring(24),
    bytes32: uint8arr => '0x' + uint8ArrayToHex(uint8arr),
    default: uint8arr =>  uint8arr.reverse().reduce((accum, val, i) => accum + val * Math.pow(256, i), 0),
}
const typeEncode = {
    uint: value => value.toString(16),
    int: value => value.toString(16),
    default: value => value,
}

const strip0x = hexString => {
    return hexString.slice(0, 2) === '0x' ? hexString.slice(2) : hexString;
}

const hexToUint8Array = hexString => {
    hexString = strip0x(hexString);
    if (hexString.length % 2 === 1) hexString = '0' + hexString;
    return Uint8Array.from(Buffer.from(hexString, 'hex'));
}

const uint8ArrayToHex = uint8arr => {
    let hexv = '';
    uint8arr.forEach(value => {
        hexv += value.toString(16).padStart(2, '0')
    });
    return hexv;
}

const decode = (uint8arr, funcabi) => {
    console.log('decode: ', logu8a(uint8arr));
    let offset = 0;
    let result = {};
    const values = funcabi.outputs.forEach(abi => {
        // const size = sizeMap[abi.type];
        const size = 32;
        const value = (typeDecode[abi.type] || typeDecode.default)(uint8arr.slice(offset, offset + size));
        
        offset += size;
        result[abi.name] = value;
    });
    return result;
}
const encode = (args, types) => {
    if (args.length !== types.length) {
        throw new Error('Values and types do not have the same length.')
    }
    const encoded = types.map((typedef, i) => {
        const size = 32;
        return strip0x((typeEncode[typedef.type] || typeEncode.default)(args[i]))
            .padStart(size * 2, '0');
    });
    return hexToUint8Array(encoded.join(''));
}

const logu8a = uint8arr => `${uint8arr.join('')}, ${uint8arr.length}`;

let newi32, newi64;
if (isNode) {
    newi32 = value => value;
    newi64 = value => BigInt(value);
} else {
    newi32 = value => new WebAssembly.Global({ value: 'i32', mutable: true }, value);
    newi64 = value => new WebAssembly.Global({ value: 'i64', mutable: true }, value);
}

module.exports = {
    strip0x,
    typeDecode,
    typeEncode,
    encode,
    decode,
    logu8a,
    uint8ArrayToHex,
    hexToUint8Array,
    newi32,
    newi64,
}