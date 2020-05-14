object "TestWasm7b" {
    code {
        datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
        return(0, datasize("Runtime"))
    }
    object "Runtime" {
        code {
            let _calldata := 512
            calldatacopy(_calldata, 0, calldatasize())

            // create new contract with code mem[p…(p+n)) and send v wei and return the new address
            let addr := create(
                callvalue(),
                _calldata,
                calldatasize()
            )

            mstore(0, addr)
            return (0, 32)
        }
    }
}
