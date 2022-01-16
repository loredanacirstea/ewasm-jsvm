const { ethers } = require('ethers');
const BN = require('bn.js');

const isNode = typeof process !== 'undefined'
    && process.versions != null
    && process.versions.node != null;

const strip0x = hexString => {
    return hexString.slice(0, 2) === '0x' ? hexString.slice(2) : hexString;
}

const evenHex = hexString => (hexString.length % 2 === 1) ? '0' + hexString : hexString;

const hexToUint8Array = hexString => ethers.utils.arrayify('0x' + evenHex(strip0x(hexString)));

const uint8ArrayToHex = uint8arr => ethers.utils.hexlify(uint8arr);

const decode = (types, uint8arr) => {
    const decoded = ethers.utils.defaultAbiCoder.decode(types, uint8ArrayToHex(uint8arr));
    if (decoded instanceof Array && decoded.length === 1 && !types[0].name) return decoded[0];
    return {...decoded};
}

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

const extractAddress = uint8arr => uint8ArrayToHex(uint8arr.slice(12));

let newi32, newi64;
if (isNode) {
    newi32 = value => value;
    newi64 = value => BigInt(value);
} else {
    newi32 = value => new WebAssembly.Global({ value: 'i32', mutable: true }, value.toString());
    newi64 = value => new WebAssembly.Global({ value: 'i64', mutable: true }, value.toString());
}

let instantiateWasm = async (wasmbin, importObj={}) => {
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

const uint8arrToBN = uint8arr => new BN(strip0x(uint8ArrayToHex(uint8arr)), 16);
const BN2hex = n => n.toString(16).padStart(64, '0');
const BN2uint8arr = (n, length = 32) => {
    length = length >= n.byteLength() ? length : n.byteLength();
    return n.toArray('be', length);
}
const toBN = n => {
    // from hex
    if (typeof n === 'string' && n.substring(0, 2) === '0x') {
        return new BN(n.substring(2), 16);
    }
    // from ethers BigNumber
    if (typeof n === 'object' && n._hex) return new BN(n._hex.substring(2), 16);
    if (n instanceof Uint8Array) return uint8arrToBN(n);
    if (BN.isBN(n)) return n;
    if (typeof n === 'bigint') return new BN(n.toString());
    return new BN(n);
}

const clone = value => JSON.parse(JSON.stringify(value));

const keccak256 = ethers.utils.keccak256;

function divCeil(a, b) {
    const div = a.div(b)
    const mod = a.mod(b)

    // Fast case - exact division
    if (mod.isZero()) return div

    // Round up
    return div.isNeg() ? div.isubn(1) : div.iaddn(1)
}

function bufferToUint8Array (buf) {
    if (!buf) return undefined;
    if (buf.constructor.name === 'Uint8Array'
    || buf.constructor === Uint8Array) {
        return buf;
    }
    if (typeof buf === 'string') buf = Buffer(buf);
    var a = new Uint8Array(buf.length);
    for (var i = 0; i < buf.length; i++) a[i] = buf[i];
    return a;
};

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
    extractAddress,
    toBN,
    BN2hex,
    BN2uint8arr,
    clone,
    keccak256,
    divCeil,
    bufferToUint8Array,
}
