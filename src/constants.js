const ERROR = {
    ASYNC_CALL: 'Asynchronous Call Stop',
    ASYNC_RESOURCE: 'Asynchronous Resource Stop',
    OUT_OF_GAS: 'out of gas',
    CODESTORE_OUT_OF_GAS: 'code store out of gas',
    STACK_UNDERFLOW: 'stack underflow',
    STACK_OVERFLOW: 'stack overflow',
    INVALID_JUMP: 'invalid JUMP',
    INVALID_OPCODE: 'invalid opcode',
    OUT_OF_RANGE: 'value out of range',
    REVERT: 'revert',
    STATIC_STATE_CHANGE: 'static state change',
    INTERNAL_ERROR: 'internal error',
    CREATE_COLLISION: 'create collision',
    STOP: 'stop',
    REFUND_EXHAUSTED: 'refund exhausted',
    VALUE_OVERFLOW: 'value overflow',
    INVALID_BEGINSUB: 'invalid BEGINSUB',
    INVALID_RETURNSUB: 'invalid RETURNSUB',
    INVALID_JUMPSUB: 'invalid JUMPSUB',
    INVALID_BYTECODE_RESULT: 'invalid bytecode deployed',
}

const BASE_TX_COST = 21000;

module.exports = {ERROR, BASE_TX_COST};
