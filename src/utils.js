const isNode = typeof process !== 'undefined'
    && process.versions != null
    && process.versions.node != null;

const sizeMap = {
    // bytes
    bytes32: 32,
    address: 20,
    u128: 16,  // 128 bit number, represented as a 16 bytes long little endian unsigned integer in memory
    u256: 32, // 256 bit number, represented as a 32 bytes long little endian unsigned integer in memory
}
const typeDecode = {
    address: uint8arr => '0x' + uint8ArrayToHex(uint8arr).substring(24),
    bytes32: uint8arr => '0x' + uint8ArrayToHex(uint8arr),
    default: uint8arr =>  uint8arr.reverse().reduce((accum, val, i) => accum + val * Math.pow(256, i), 0),
}

const leftPadEnc = (value, size) => value.toString(16).padStart(size * 2, '0');
const typeEncode = {
    uint: leftPadEnc,
    uint256: leftPadEnc,
    int: leftPadEnc,
    int256: leftPadEnc,
    address: (value, size) => value.padStart(size * 2, '0'),
    bytes32: (value, size) => value.padEnd(size * 2, '0'),
    bytes4: value => value,
    bytes: value => value,
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

const decode = (uint8arr, types) => {
    let offset = 0;
    let result = {};
    const values = types.forEach(abi => {
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
        return typeEncode[typedef.type](strip0x(args[i]), size)
    });
    return hexToUint8Array(encoded.join(''));
}

const encodeWithSignature = (signature, args, types) => {
    if (args.length !== types.length) {
        throw new Error('Values and types do not have the same length.')
    }
    const encoded = types.map((typedef, i) => {
        const size = 32;
        return typeEncode[typedef.type](strip0x(args[i]), size)
    });
    return hexToUint8Array(signature + encoded.join(''));
}

const randomHex = (size) => {
    // hex values
    let allowed = [...Array(6).keys()].map(i => i + 97)
        .concat([...Array(10).keys()].map(i => i + 48));
    return '0x' + [...Array(size).keys()]
        .map(i => Math.floor(Math.random() * 16))
        .map(index => String.fromCharCode(allowed[index]))
        .join('');
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

// 0061736d - magic number
// 010000000 - version 1 (little endian)
const isHexWasm = source => source.substring(0, 8) === '0061736d'

// \x00asm
// [ 0, 97, 115, 109 ]
const isBinWasm = uint8Array => uint8Array[0] === 0 && uint8Array[1] === 97 && uint8Array[2] === 115 && uint8Array[3] === 109;

module.exports = {
    strip0x,
    typeDecode,
    typeEncode,
    encodeWithSignature,
    encode,
    decode,
    logu8a,
    uint8ArrayToHex,
    hexToUint8Array,
    newi32,
    newi64,
    isHexWasm,
    isBinWasm,
    randomHex,
}