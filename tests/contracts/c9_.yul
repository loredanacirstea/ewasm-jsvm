object "TestWasm9" {
    code {
        datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
        return(0, datasize("Runtime"))
    }
    object "Runtime" {
        code {
            let _calldata := 256

            calldatacopy(_calldata, 0, calldatasize())

            let addr := mslice(add(_calldata, 12), 20)

            let success := staticcall(gas(), addr, 0, 0, 0, 0)
            returndatacopy(0, 0, returndatasize())
            return (0, returndatasize())

            function mslice(position, length) -> result {
              if gt(length, 32) { revert(0, 0) }
              result := div(mload(position), exp(2, sub(256, mul(length, 8))))
            }
        }
    }
}
