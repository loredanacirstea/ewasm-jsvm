const {uint8ArrayToHex} = require('./utils.js');

const LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    SILENT: 'SILENT',
}
const ORDER = {
    DEBUG: 4,
    INFO: 3,
    WARN: 2,
    ERROR: 1,
    SILENT: 0,
}

const DEEFAULT_HANDLER = {
    DEBUG: (...args) => console.debug(...args),
    INFO: (...args) => console.info(...args),
    WARN: (...args) => console.warn(...args),
    ERROR: (...args) => console.error(...args),
}

const globalLevel = LEVELS.ERROR;

const printval = val => {
    if (val instanceof Uint8Array) return uint8ArrayToHex(val);
    if (val instanceof Object) {
        return '{' + Object.keys(val).map(key => key + ': ' + printval(val[key])).join(', ') + '}';
    }
    return val;
}

const logg = (name, _level, _handler, filterExclude=[], filterInclude=[]) => {
    if (!(filterExclude instanceof Array)) throw new Error('filterExclude must be an Array');
    if (!(filterInclude instanceof Array)) throw new Error('filterInclude must be an Array');

    let level = _level || globalLevel;
    const loggers = {};
    let handler = lvl => (...args) => {
        if (ORDER[lvl] <= ORDER[level]) {
            if (filterExclude.some(marker => name.includes(marker))) return;
            if (filterInclude.length > 0 && !filterInclude.some(marker => name.includes(marker))) return;
            const logged = _handler ? _handler(...args) : args.map(printval).join(', ');
            DEEFAULT_HANDLER[lvl](name, logged);
        }
    }

    const self = {
        LEVELS,
        debug: handler(LEVELS.DEBUG),
        info: handler(LEVELS.INFO),
        warn: handler(LEVELS.WARN),
        error: handler(LEVELS.ERROR),
        setLevel: (newlevel) => level = newlevel,
        spawn: (subname, sublevel, subhandler) => {
            loggers[subname] = logg(name + '_' + subname, sublevel || level, subhandler);
            return loggers[subname];
        },
        get: subname => {
            if (loggers[subname]) return loggers[subname];
            return self.spawn(subname);
        }
    }
    return self;
}

const txhandler = (msg, txobj) => {
    const {from, to, value, data} = txobj;
    const newobj = {from, to, value, data: data ? printval(data.slice(0,50)) : null};
    return msg + ' ' + JSON.stringify(newobj);
}
const contexthandler = (msg, txobj) => {
    const printobj = {};
    Object.keys(txobj).forEach(key => {
        const {address, balance, storage, runtimeCode} = txobj[key];
        printobj[key] = {address, balance, storage, runtimeCode: runtimeCode ? printval(runtimeCode.slice(0, 50)) : null};
    })
    return msg + ' ' + printval(printobj);
}

const Logger = logg('', LEVELS.SILENT, null, [], []);
Logger.spawn('jsvm');
Logger.spawn('ewasmvm');
Logger.get('jsvm').spawn('tx', null, txhandler);
Logger.get('ewasmvm').spawn('tx', null, txhandler);
Logger.get('ewasmvm').spawn('context', null, contexthandler);

module.exports = Logger;