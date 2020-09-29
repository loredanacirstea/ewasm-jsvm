object "TestWasm9" {
    code {
        datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
        return(0, datasize("Runtime"))
    }
    object "Runtime" {
        code {
            let _calldata := 256
            mstore(0x40, 448)

            calldatacopy(_calldata, 0, calldatasize())

            let addr := mslice(add(_calldata, 12), 20)

            // callStatic
            let success := staticcall(gas(), addr, add(_calldata, 32), 32, 0, 0)
            let data1size := returndatasize()

            returndatacopy(444, 0, data1size)

            let success2 := staticcall(gas(), addr, add(_calldata, 32), 32, 0, 0)
            let data2size := returndatasize()
            returndatacopy(add(444, data1size), 0, data2size)

            // add offset & length to create bytes
            mstore(380, 32)
            mstore(412, 64)
            return (380, add(add(data1size, data2size), 64))

            function mslice(position, length) -> result {
              if gt(length, 32) { revert(0, 0) }
              result := div(mload(position), exp(2, sub(256, mul(length, 8))))
            }

            // TODO
            // call
            // let success := call(gas(), addr, 0, input_ptr, 4, 0, 0)
            // callCode
            // callDelegate

        }
    }
}
