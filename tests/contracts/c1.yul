object "TestWasm1" {
    code {
        // mstore(0, 0xeeeeeeeeeeeeeeee)
        
        mstore(0, 0xeeeeeeeeeeeeee)
        return (0, 32)
    }
}
