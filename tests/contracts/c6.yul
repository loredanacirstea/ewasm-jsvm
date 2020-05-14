object "TestWasm6" {
    code {
        datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
        return(0, datasize("Runtime"))
    }
    object "Runtime" {
        code {
            let _calldata := 512
            let _data := 1024

            // callDataCopy
            calldatacopy(_calldata, 0, calldatasize())

            // getExternalBalance i32
            let account := mload(_calldata)
            mstore(_data, balance(account))

            return (_data, 32)
        }
    }
}
