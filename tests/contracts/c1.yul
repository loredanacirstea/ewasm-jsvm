object "TestWasm1" {
    code {
         mstore(0, 999999)
         return (0, 32)
    }
}
