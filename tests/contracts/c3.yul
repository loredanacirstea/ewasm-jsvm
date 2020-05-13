object "TestWasm3" {
    code {
        datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
        return(0, datasize("Runtime"))
    }
    object "Runtime" {
        code {

            // getAddress
            let addr := address()
            mstore(0, addr)

            // getCaller
            mstore(32, caller())

            // getExternalBalance i32
            mstore(64, balance(addr))

            // getCallValue i32
            mstore(96, callvalue())

            // getCallDataSize
            mstore(128, calldatasize())

            // getTxOrigin
            mstore(160, origin())

            // getBlockDifficulty
            mstore(196, difficulty())

            // // log
            // log0(0, 40)
            // log1(0, 40, 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff)
            // log2(0, 40, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffd)
            // log3(0, 40, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffb, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa)
            // log4(0, 40, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7, 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff6)
            
            // storageStore
            sstore(0, address())
            // storageLoad
            mstore(228, mload(0))

            // return (0, 260)

            // callDataCopy
            calldatacopy(300, 0, calldatasize())

            return (0, 260)

            // codeCopy

            // externalCodeCopy

            // getExternalCodeSize i32

            // getReturnDataSize

            // returnDataCopy


            // i64

            // getBlockHash
            // mstore(136, blockhash(2))

            // getGasLeft i64
            // let g := gas()

            // getBlockGasLimit i64
            // let gas_limit := gaslimit()

            // getTxGasPrice
            // gasprice()

            // getBlockNumber i64
            // let block_number := number()

            // getBlockTimestamp i64
            // timestamp()

            // call
            // let addr2 := 0xD32298893dD95c1Aaed8A79bc06018b8C265a279
            // let success := call(gas(), addr2, 1000, 0, 0, 0, 0)

            // callCode

            // callDelegate

            // callStatic

            // selfDestruct

            // create


            // finish
            return (0, 220)

            // revert
            // revert(0, 264)
        }
    }

}
