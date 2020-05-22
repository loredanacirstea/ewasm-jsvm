const { ethers } = require('ethers');

const isNode = typeof process !== 'undefined'
    && process.versions != null
    && process.versions.node != null;

const strip0x = hexString => {
    return hexString.slice(0, 2) === '0x' ? hexString.slice(2) : hexString;
}

const evenHex = hexString => (hexString.length % 2 === 1) ? '0' + hexString : hexString;

const hexToUint8Array = hexString => ethers.utils.arrayify('0x' + evenHex(strip0x(hexString)));

const uint8ArrayToHex = uint8arr => ethers.utils.hexlify(uint8arr);

const decode = (types, uint8arr) => ethers.utils.defaultAbiCoder.decode(types, uint8ArrayToHex(uint8arr));

const encode = (types, args) => {
    const encoded = ethers.utils.defaultAbiCoder.encode(types, args);
    return hexToUint8Array(encoded);
}

const encodeWithSignature = (signature, types, args) => {
    const encoded = ethers.utils.defaultAbiCoder.encode(types, args);
    return hexToUint8Array(signature + encoded.substring(2));
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

const randomAddress = () => randomHex(40);// ethers.utils.getAddress(randomHex(40))
const randomHash = () => randomHex(64);

const logu8a = uint8arr => `${uint8arr.join('')}, ${uint8arr.length}`;

let newi32, newi64;
if (isNode) {
    newi32 = value => value;
    newi64 = value => BigInt(value);
} else {
    newi32 = value => new WebAssembly.Global({ value: 'i32', mutable: true }, value);
    newi64 = value => new WebAssembly.Global({ value: 'i64', mutable: true }, value);
}

let instantiateWasm = async (wasmbin, importObj) => {
    if (isNode) {
        const wmodule = new WebAssembly.Module(wasmbin);
        const instance = new WebAssembly.Instance(wmodule, importObj);
        return {instance, module: wmodule};
    }
    // For browsers, we use this trick to make the function async and thus,
    // not hogging the main thread which doesn't allow wasm compilation > 4kb
    return await WebAssembly.instantiateStreaming(new Promise((resolve, reject) => {
        resolve(new Response(wasmbin, {status: 200, headers: {"Content-Type": "application/wasm"}}));
    }), importObj);
}

// 0061736d - magic number
// 010000000 - version 1 (little endian)
const isHexWasm = source => source.substring(0, 8) === '0061736d'

// \x00asm
// [ 0, 97, 115, 109 ]
const isBinWasm = uint8Array => uint8Array[0] === 0 && uint8Array[1] === 97 && uint8Array[2] === 115 && uint8Array[3] === 109;

module.exports = {
    strip0x,
    encodeWithSignature,
    encode,
    decode,
    logu8a,
    uint8ArrayToHex,
    hexToUint8Array,
    newi32,
    newi64,
    instantiateWasm,
    isHexWasm,
    isBinWasm,
    randomHex,
    randomHash,
    randomAddress,
}