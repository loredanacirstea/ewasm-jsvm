const {Logger} = require('./config');
const {
    persistence,
    blocks,
    logs,
} = require('./persistence.js');

const _vmcore = require('./jsvm.js');
const _ewasmjsvm = require('./ewasm.js');
const _evm = require('./evm.js');
const _near = require('./near.js');
const _instance = require('./instance');
const utils = require('./utils.js');

const vmcore = () => _vmcore(persistence, blocks, logs, Logger);
const ewasmjsvm = () => _instance({
    vmname: 'ewasmjsvm',
    vmcore: vmcore(),
    initializeImports: _ewasmjsvm.initializeImports,
    instantiateModule: _ewasmjsvm.instantiateModule,
});
const evmjs = () => _instance({
    vmname: 'evmjs',
    vmcore: vmcore(),
    initializeImports: _evm.initializeImports,
    instantiateModule: _evm.instantiateModule,
});
const nearjs = () => _instance({
    vmname: 'nearjs',
    vmcore: _near.vmcore(persistence, blocks, logs, Logger),
    initializeImports: _near.initializeImports,
    instantiateModule: _near.instantiateModule,
});

module.exports = {
    vmcore,
    ewasmjsvm,
    evmjs,
    nearjs,
    utils,
}
