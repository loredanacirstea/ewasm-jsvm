object "TestWasm3" {
    code {
        datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
        return(0, datasize("Runtime"))
    }
    object "Runtime" {
        code {

            let data_ptr := 512

            // getAddress
            let addr := address()
            mstore(data_ptr, addr)

            // getCaller
            mstore(slotPtr(data_ptr, 1), caller())

            // getExternalBalance i32
            mstore(slotPtr(data_ptr, 2), balance(addr))

            // getCallValue i32
            mstore(slotPtr(data_ptr, 3), callvalue())

            // getCallDataSize
            mstore(slotPtr(data_ptr, 4), calldatasize())

            // getTxOrigin
            mstore(slotPtr(data_ptr, 5), origin())

            // getBlockDifficulty
            mstore(slotPtr(data_ptr, 6), difficulty())
            
            // storageStore
            sstore(0, address())
            // storageLoad
            mstore(slotPtr(data_ptr, 7), sload(0))

             // getGasLeft i64
            mstore(slotPtr(data_ptr, 8), gas())

            // getBlockHash
            mstore(slotPtr(data_ptr, 9), blockhash(2))

            // getBlockGasLimit i64
            mstore(slotPtr(data_ptr, 10), gaslimit())

            // getTxGasPrice
            mstore(slotPtr(data_ptr, 11), gasprice())

            // getBlockNumber i64
            mstore(slotPtr(data_ptr, 12), number())

            // getBlockTimestamp i64
            mstore(slotPtr(data_ptr, 13), timestamp())

            return (data_ptr, slotOffset(14))


            // // callDataCopy
            // calldatacopy(500, 0, calldatasize())


            // // log
            // log0(0, 40)
            // log1(0, 40, 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff)
            // log2(0, 40, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffd)
            // log3(0, 40, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffb, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa)
            // log4(0, 40, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff6)

            // codeCopy

            // externalCodeCopy

            // getExternalCodeSize i32

            // getReturnDataSize

            // returnDataCopy

            // call
            // let addr2 := 0xD32298893dD95c1Aaed8A79bc06018b8C265a279
            // let success := call(gas(), addr2, 1000, 0, 0, 0, 0)

            // callCode

            // callDelegate

            // callStatic

            // selfDestruct

            // create


            // finish
            // return (0, 220)

            // revert
            // revert(0, 264)

            function slotOffset(count) -> offset {
                offset := mul(count, 32)
            }

            function slotPtr(ptr, count) -> _ptr {
                _ptr := add(ptr, slotOffset(count))
            }
        }
    }

}
