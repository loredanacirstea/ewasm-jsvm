const fs = require('fs');
const { exec } = require('child_process');
const {promisify} = require('./utils');
const abis = require('./fixtures');

const C_PATH = './tests/contracts';
const SOL_PATH = './tests/sol';
const B_PATH = './tests/build';
const solToYul = name => `solc --ir -o ${C_PATH} ${SOL_PATH}/${name}.sol --overwrite`;
const yulToEwasm = name => `solc --strict-assembly --optimize --yul-dialect evm --machine ewasm ${C_PATH}/${name}.yul`;
const yulToEvm = name => `solc --strict-assembly --optimize --yul-dialect evm --machine evm ${C_PATH}/${name}.yul`;
// const yulToEwasm = name => `solc --strict-assembly --yul-dialect evm --machine ewasm ${C_PATH}/${name}.yul`;
const watToWasm = name => `wat2wasm build_wat/${name}.wat -o build_wasm/${name}.wasm`;

const compileEvm = name => new Promise((resolve, reject) => {
    const command = yulToEvm(name);
    exec(command, async (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            reject(error);
        }
        if (stderr) {
            // Logger.get('tests').get('compile').warn(stderr);
            // reject(error);
        }
        // const filepath = `${B_PATH}/${name}.bin`;
        // const bin = await promisify(fs.readFile, filepath).catch(console.log);
        // resolve(bin);
        resolve(parseCompilerOutput(stdout));
    });
});

const compile = name => new Promise((resolve, reject) => {
    const command = yulToEwasm(name);
    // Logger.get('tests').get('compile').debug('Running command: ' + command);
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            reject(error);
        }
        if (stderr) {
            // Logger.get('tests').get('compile').warn(stderr);
            // reject(error);
        }
        resolve(parseCompilerOutput(stdout));
    });
});

const compileSol = name => new Promise((resolve, reject) => {
    const command = solToYul(name);
    // Logger.get('tests').get('compileSol').debug('Running command: ' + command);
    exec(command, async (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            reject(error);
        }
        if (stderr) {
            // Logger.get('tests').get('compileSol').warn(stderr);
        }
        // The .yul file has been created
        resolve();
    });
});

async function createBuild(name, { bin, optimized, yul_wasm, wat}) {
    const basePath = B_PATH + '/' + name + '_';

    await promisify(fs.writeFile, basePath + 'bin', bin).catch(console.log);
    await promisify(fs.writeFile, basePath + 'wat.wat', wat).catch(console.log);
    await promisify(fs.writeFile, basePath + 'wasm.yul', yul_wasm).catch(console.log);
    await promisify(fs.writeFile, basePath + 'opt.yul', optimized).catch(console.log);
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

const postIndex = (str, marker) => {
    const index = str.indexOf(marker);
    return {
        pre: index - 1,
        post: index + marker.length + 1,
    }
}

const compileContracts = async () => {
    const contracts = {};

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
        contracts[name].abi = abis[name];
    }

    // Compile to Evm
    for (name of names) {
        contracts[name].evm = (await compileEvm(name)).bin;
    }
    return contracts;
}

module.exports = {
    compileEvm,
    compile,
    compileSol,
    compileContracts,
}
