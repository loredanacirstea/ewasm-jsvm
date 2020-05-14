object "TestWasm7" {
    code {
        datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
        return(0, datasize("Runtime"))
    }
    object "Runtime" {
        code {
            // create new contract with code mem[p…(p+n)) and send v wei and return the new address
            let addr := create(
                callvalue(),
                dataoffset("SecondContract"),
                datasize("SecondContract")
            )

            mstore(0, addr)
            return (0, 32)
        }

        object "SecondContract" {
            code {
                mstore(0, 999999)
                return (0, 32)
            }
        }
    }
}
