object "TestWasm4" {
    code {
        datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
        return(0, datasize("Runtime"))
    }
    object "Runtime" {
        code {
            // mstore(0, 0xeeeeeeeeeeeeeeee)
            
            mstore(0, 0xeeeeeeeeeeeeee)
            revert (0, 32)
        }
    }
}
