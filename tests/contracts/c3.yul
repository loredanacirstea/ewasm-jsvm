object "TestWasm3" {
    code {
        // codeCopy
        datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
        return(0, datasize("Runtime"))
    }
    object "Runtime" {
        code {

            let _calldata := 96
            let data_ptr := 256

            // callDataCopy
            calldatacopy(_calldata, 0, calldatasize())

            // add, exp
            let _baseno := calldatasize()
            let exp_1 := exp(_baseno, 3)
            let exp_2 := exp(_baseno, 10000)
            let multiv := add(exp_1, exp_2)
            mstore(slotPtr(data_ptr, 19), multiv)

            // keccak
            mstore(0, 0x11)
            mstore(32, 0x22)
            mstore(slotPtr(data_ptr, 20), keccak256(0, 64))

            // getAddress
            let addr := address()
            mstore(data_ptr, addr)

            // getCaller
            mstore(slotPtr(data_ptr, 1), caller())

            // getExternalBalance i32
            let account := mload(add(_calldata, 32))
            mstore(slotPtr(data_ptr, 2), balance(account))

            // log0(slotPtr(data_ptr, 2), 32)

            // getCallValue i32
            mstore(slotPtr(data_ptr, 3), callvalue())

            // getCallDataSize
            mstore(slotPtr(data_ptr, 4), calldatasize())

            // getTxOrigin
            mstore(slotPtr(data_ptr, 5), origin())

            // getBlockDifficulty
            mstore(slotPtr(data_ptr, 6), difficulty())

            // storageLoad
            mstore(slotPtr(data_ptr, 7), sload(0))

            // storageStore
            sstore(0, address())
            // storageLoad
            mstore(slotPtr(data_ptr, 7), sload(0))

            // getGasLeft i64
            mstore(slotPtr(data_ptr, 8), gas())

            // log2(slotPtr(data_ptr, 8), 32, 55555554, 55555553)

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

            // getBlockCoinbase address
            mstore(slotPtr(data_ptr, 14), coinbase())

            // getCodeSize
            mstore(slotPtr(data_ptr, 15), codesize())

            // log3(slotPtr(data_ptr, 15), 32, 55555552, 55555551, 55555550)

            let addr2 := mload(_calldata)
            mstore(slotPtr(data_ptr, 16), addr2)

            // getExternalCodeSize i32
            mstore(slotPtr(data_ptr, 17), extcodesize(addr2))

            // externalCodeCopy
            extcodecopy(addr2, slotPtr(data_ptr, 18), 0, 32)

            return (data_ptr, slotOffset(20))

            function slotOffset(count) -> offset {
                offset := mul(count, 32)
            }

            function slotPtr(ptr, count) -> _ptr {
                _ptr := add(ptr, slotOffset(count))
            }
        }
    }

}
