object "TestWasm12" {
    code {
        let len := 4
            let result := 5

            for { let i := 1 } lt(i, len) { i := add(i, 1) } {
                result := add(result, i)
            }

            mstore(0, result)
            return (0, 32)
    }
}
