object "TestWasm4" {
    code {
        datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
        return(0, datasize("Runtime"))
    }
    object "Runtime" {
        code {
            // logs
            let logDataPos := 512
            mstore(logDataPos, 777777)
            
            log0(logDataPos, 32)
            log1(logDataPos, 32, 55555555)
            log2(logDataPos, 32, 55555554, 55555553)
            log3(logDataPos, 32, 55555552, 55555551, 55555550)
            log4(logDataPos, 32, 55555549, 55555548, 55555547, 55555546)

            return (0, 0)
        }
    }
}
