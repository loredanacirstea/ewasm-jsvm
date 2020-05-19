object "TaylorInterpreter" {
    code {
        datacopy(0, dataoffset("Runtime"), datasize("Runtime"))
        return(0, datasize("Runtime"))
    }
    object "Runtime" {
        code {
        function safeAdd(x, y) -> z {
          z := add(x, y)
          require(or(eq(z, x), gt(z, x)))
        }
        
        function safeSub(x, y) -> z {
          z := sub(x, y)
          require(or(eq(z, x), lt(z, x)))
        }
        
        function safeMul(x, y) -> z {
          if gt(y, 0) {
            z := mul(x, y)
            // require(eq(div(z, y), x))
          }
        }
        
          function safeDiv(x, y) -> z {
            require(gt(y, 0))
            z := div(x, y)
          }
          
function require(arg) {
  if lt(arg, 1) {
    revert(0, 0)
  }
}

function mslice(position, length) -> result {
  if gt(length, 32) { revert(0, 0) } // protect against overflow

  result := shr(sub(256, mul(length, 8)), mload(position))
}



        function Type_sig_bytecode(pos) -> res {
          res := mslice(Type_sig_bytecode_position(pos), 4)
        }
        


        function Type_sig_bytecode_position(pos) -> _offset {
          _offset := add(0x00, add(pos, 0))
        }
        


        function Type_steps(pos) -> res {
          res := mslice(Type_steps_position(pos), 1)
        }
        


        function Type_steps_position(pos) -> _offset {
          _offset := add(0x04, add(pos, 0))
        }
        


        function ProgStep_inputIndexes_encodeTight(pos, newpos) {
          let length := ProgStep_inputIndexes_length(pos)
          
            mstore(newpos, shl(mul(28, 8), length))
            let newposi := add(newpos, 4)
          for { let i := 0 } lt(i, length) { i := add(i, 1) } {
            let addition := mul(i, 1)
            mstore(add(newposi, addition), shl(mul(sub(32, 1), 8), ProgStep_inputIndexes(pos, i)))
          }
        }
        


        function ProgStep_inputIndexes_length(pos) -> _length {
          _length := mslice(ProgStep_inputIndexes_position(pos), 4)
        }
        


        function ProgStep_inputIndexes_position(pos) -> _offset {
          _offset := add(0x04, add(pos, 0))
        }
        


        function ProgStep_inputIndexes(pos, i) -> res {
          res := mslice(add(ProgStep_inputIndexes_values_position(pos),
            mul(i, 1)), 1)
        }
        


        function ProgStep_inputIndexes_values_position(pos) -> _offset {
          _offset := add(ProgStep_inputIndexes_position(pos), 4)
        }
        


        function ProgStep_typeid_position(pos) -> _offset {
          _offset := add(0x00, add(pos, 0))
        }

        function ProgStep_typeid(pos) -> res {
          res := mslice(ProgStep_typeid_position(pos), 4)
        }

            // this ptr gets overwritten after each internal function call
            let _internal_output_ptr := 128
            let _calldata := 256
            let _calldata2 := safeAdd(_calldata, 4)
            let _data := safeAdd(_calldata2, 4)
            let _internal_data := safeAdd(_data, 2048)

            calldatacopy(_calldata, 0, calldatasize())

            let fsig := mslice(_calldata, 4)

            switch fsig

            case 0xffffffff {
                let sig_len := getSignatureLength(_calldata2)

                // !!! always 96 diff between them
                // let starts_ptr := _data
                // let inputs_ptr := add(starts_ptr, 96)
                // dtype data := sub(starts_ptr, 512)
                // _runtime_fns := sub(starts_ptr, 1024)

                addGraphProgInput(safeAdd(_calldata2, sig_len), _internal_data, safeAdd(_internal_data, 96), 0)

                executeInternal(_calldata2, _internal_data, _internal_output_ptr)

                let input_size := getlengthFromStarts(_internal_output_ptr)
                let starts_size := getStartsLength(_internal_output_ptr)

                return (_internal_output_ptr, safeAdd(starts_size, input_size))
            }

            // case dtsig"function store(bytes4 sig) view public returns(u32)" {
            case 0xfffffffe {
                // sstore(mappingInKey(Data_type_sig_in(_data)), Data_type_sig_bytecode(_data))
                // sstore(mappingOutKey(Data_type_sig_out(_data)), Data_type_sig_bytecode(_data))

                // input length
                let _ptr := _calldata2
                let sig_bytecode := Type_sig_bytecode(safeAdd(_ptr, 4))

                storeType(_ptr, sig_bytecode)
                

                // _ptr := safeAdd(safeAdd(_ptr, mslice(_ptr, 4)), 4)
                // storeInput(_ptr, sig_bytecode)

                // _ptr := safeAdd(safeAdd(_ptr, mslice(_ptr, 4)), 4)
                // storeProgSteps(_ptr, sig_bytecode)

                // logInsertSignature(sig_bytecode)
                return (0, 0)
            }

            // read from storage
            case 0xfffffffd {
                let sig := mslice(_calldata2, 4)
                let _output_ptr := _internal_output_ptr
                let length := 0

                let _dtype_ptr := safeAdd(_output_ptr, 4)
                getType(_dtype_ptr, sig)

                length := safeAdd(safeAdd(length, mslice(_dtype_ptr, 4)), 4)

                let _input_ptr := safeAdd(_dtype_ptr, length)
                getInput(_input_ptr, sig)
                length := safeAdd(safeAdd(length, mslice(_input_ptr, 4)), 4)

                let _step_ptr := safeAdd(_dtype_ptr, length)
                getProgSteps(_step_ptr, sig)

                length := safeAdd(safeAdd(length, mslice(_step_ptr, 4)), 4)

                return(_dtype_ptr, length)
            }

            // insert named type
            // 0xffffffff33333326ee0000010000000722000003777777
            case 0xfffffffc {
                // named type id, abstract_type_id, inputs
                let named_type_id := mslice(_calldata2, 4)
                let data_ptr := safeAdd(_calldata2, 12)
                storeCurried(data_ptr, named_type_id)
            }

            // get named type
            // 0xffffffff33333325ee000002000000080000001022000004220000031100000400000001
            case 0xfffffffb {
                // type_id
                let named_type_id := mslice(_calldata2, 4)
                getCurried(_internal_output_ptr, named_type_id)
                return (safeAdd(_internal_output_ptr, 4), mslice(_internal_output_ptr, 4))
            }

            // Execute graph from calldata
            case 0xfffffffa {
                let success := executeGraphWrapper(_calldata2, _internal_data, _internal_output_ptr)

                let input_size := getlengthFromStarts(_internal_output_ptr)
                let starts_size := getStartsLength(_internal_output_ptr)

                return (_internal_output_ptr, safeAdd(starts_size, input_size))
            }

            // // Register other Taylor contracts
            // case 0xfffffff9 {
            //     // named type id, abstract_type_id, inputs
            //     let address_type := mslice(_calldata2, 4)
            //     // TODO named type
            //     dtrequire(eq(address_type, 0x11000014), 0xe0)
            //     let index := storeRegisteredAddress(_calldata2)
            //     mslicestore(0, uconcat(0xee0000010000000811000004, index, 4), 16)
            //     return (0, 16)
            // }

            // // Get registered address of other Taylor contracts
            // case 0xfffffff8 {
            //     // index
            //     let index_type := mslice(_calldata2, 4)
            //     dtrequire(eq(index_type, 0x11000004), 0xe0)

            //     let index := mslice(safeAdd(_calldata2, 4), 4)
            //     let addr := getRegisteredAddress(index)
            //     mslicestore(_internal_output_ptr, 0xee00000100000018, 8)
            //     mstore(safeAdd(_internal_output_ptr, 8), addr)
            //     return (_internal_output_ptr, 32)
            // }

            default {
                mslicestore(0, 0xffff, 2)
                revert(0, 2)
            }

            function executeInternal(_sig_ptr, _data_ptr, _output_ptr) {
                let success := executeBaseFunction(_sig_ptr, _data_ptr, _output_ptr)

                if eq(success, 0x00) {
                    success := executeVirtualFunction(_sig_ptr, _data_ptr, _output_ptr)
                }

                if eq(success, 0x00)  {
                    success := executeGraph(_sig_ptr, _data_ptr, _output_ptr)
                }

                if eq(success, 0x00) {
                    success := executeCurriedType(_sig_ptr, _data_ptr, _output_ptr)
                }

                // if eq(success, 0x00) {
                //     success := executeRegistered(_sig_ptr, _data_ptr, _output_ptr)
                // }

                if eq(success, 0x00) {
                    dtrequire(0x00, 0xec)
                }
            }

            // function executeRegistered(sig_ptr, rdata_ptr, _output_ptr) -> success {
            //     success := 0x00
            //     let count := getRegistrationCounter()
            //     let loop_again := 0x01
            //     let _starts_ptr := rdata_ptr
            //     let _inputs_ptr := safeAdd(_starts_ptr, 96)

            //     if gt(count, 0) {
            //         let sig_length := getSignatureLength(sig_ptr)
            //         let temp_ptr := 0x80

            //         mslicestore(temp_ptr, 0xffffffff, 4)
            //         mmultistore(
            //             safeAdd(temp_ptr, 4),
            //             sig_ptr,
            //             sig_length
            //         )

            //         let data_length := safeAdd(4, sig_length)

            //         // TODO: fixme in a general way (Nothing type handling)
            //         if gt(getSize(_starts_ptr), 0) {
            //             identity(_starts_ptr, _inputs_ptr, safeAdd(temp_ptr, data_length))

            //             data_length := safeAdd(
            //                 data_length,
            //                 safeAdd(
            //                     getTypeLength(safeAdd(temp_ptr, data_length)),
            //                     getStartsLength(safeAdd(temp_ptr, data_length))
            //                 )
            //             )
            //         }

            //         // return (temp_ptr, data_length)

            //         for { let i := 1 } loop_again { i := safeAdd(i, 1) } {
            //             let addr := shr(96, shl(32, getRegisteredAddress(i)))

            //             let callSuccess := staticcall(gas(), addr, temp_ptr, data_length, 0, 0)

            //             // if eq(i, 2) {
            //             //     // mstore(0, returndatasize())
            //             //     // return (0, 32)
            //             //
            //             //     // returndatacopy(0, 0, returndatasize())
            //             //     // return (0, returndatasize())
            //             // }

            //             if eq(callSuccess, 1) {
            //                 returndatacopy(_output_ptr, 0, returndatasize())
            //                 loop_again := 0x00
            //                 success := 0x01
            //             }

            //             if eq(lt(i, count), 0x00) {
            //                 loop_again := 0x00
            //             }
            //         }
            //     }
            // }

            // E_g_ sized types 22000004 & named types
            function executeCurriedType(sig_ptr, data_ptr, output_ptr) -> success {
                success := 0x00
                let temp_ptr := 0x80
                let _new_data_ptr := safeAdd(data_ptr, 1024)
                let _new_inputs_ptr := safeAdd(_new_data_ptr, 96)

                // first check if a named type exists
                getCurried(temp_ptr, getTypeSignatureBase(sig_ptr))

                let abstract_type_id := safeAdd(temp_ptr, 4)

                switch getSig(abstract_type_id)
                // sized type
                case 0 {
                    let size := 0
                    let rest := 0
                    // TODO: vodoo
                    // abstract_type_id, size, rest := decomposeType(sig)

                    mslicestore(abstract_type_id, uconcat(getSig(sig_ptr), 0x00, 3), 4)
                    size := getSize(sig_ptr)
                    rest := safeSub(getSignatureLength(sig_ptr), 4)

                    switch rest
                    case 0 {
                        mslicestore(_new_data_ptr, 0xee00000100000007, 8)
                        mslicestore(_new_inputs_ptr, uconcat(0x11000003, size, 3), 7)
                    }
                    default {
                        mslicestore(_new_data_ptr, 0xee000002000000070000000f, 12)
                        mslicestore(_new_inputs_ptr, uconcat(0x11000003, size, 3), 7)
                        mslicestore(safeAdd(_new_inputs_ptr, 7), uconcat(0x22, rest, 3), 4)
                        mmultistore(safeAdd(_new_inputs_ptr, 11), safeAdd(sig_ptr, 4), rest)
                    }
                }
                // named type
                default {
                    let starts_ptr := safeAdd(temp_ptr, 8)
                    let starts_size := getStartsLength(starts_ptr)
                    let input_size := getlengthFromStarts(starts_ptr)
                    let input_ptr := safeAdd(starts_ptr, starts_size)
                    // store starts
                    mmultistore(_new_data_ptr, starts_ptr, starts_size)
                    // store inputs
                    mmultistore(_new_inputs_ptr, input_ptr, input_size)
                }
                success := executeGraph(abstract_type_id, _new_data_ptr, output_ptr)
            }

            function executeGraphWrapper(data_ptr, gdata_ptr, goutput_ptr) -> success {
                success := 0x00

                // There might be external inputs at _starts_ptr & _inputs_ptr
                // we get the length & write ProgInput_input after it
                let _starts_ptr1 := gdata_ptr
                let _inputs_ptr := safeAdd(_starts_ptr1, 96)

                addGraphProgInput(data_ptr, _starts_ptr1, _inputs_ptr, 0)

                let input_size := getlengthFromStarts(data_ptr)
                let starts_size := getStartsLength(data_ptr)

                let _dtype_ptr := safeAdd(safeAdd(data_ptr, input_size), starts_size)
                let _input_ptr := safeAdd(safeAdd(_dtype_ptr, mslice(_dtype_ptr, 4)), 4)
                let _steps_ptr := safeAdd(safeAdd(_input_ptr, mslice(_input_ptr, 4)), 4)

                // mstore add graph starts & inputs to possibly already existing starts & inputs
                if gt(mslice(_input_ptr, 4), 0) {
                    addGraphProgInput(safeAdd(_input_ptr, 4), _starts_ptr1, _inputs_ptr, 1)
                }

                executeGraphSteps(
                    _steps_ptr,
                    _starts_ptr1,
                    _inputs_ptr,
                    Type_steps(safeAdd(_dtype_ptr, 4)),
                    goutput_ptr
                )
                success := 0x01
            }

            function executeGraph(sig_ptr, gdata_ptr, goutput_ptr) -> success {
                success := 0x00
                let sig := getTypeSignatureBase(sig_ptr)

                // There might be external inputs at _starts_ptr & _inputs_ptr
                // we get the length & write ProgInput_input after it
                let _starts_ptr1 := gdata_ptr
                let _inputs_ptr := safeAdd(_starts_ptr1, 96)
                let _dtype_ptr := safeSub(gdata_ptr, 512)

                // if eq(sig, 0x44000000) { return (gdata_ptr, 128) }

                // Get dtype data from storage
                getType(_dtype_ptr, sig)

                if eq(Type_sig_bytecode(safeAdd(_dtype_ptr, 4)), sig) {
                    // Get dtype input data from storage
                    let _input_ptr := safeAdd(safeAdd(_dtype_ptr, mslice(_dtype_ptr, 4)), 4)
                    getInput(_input_ptr, sig)

                    // mstore add graph starts & inputs to possibly already existing starts & inputs
                    addGraphProgInput(safeAdd(_input_ptr, 4), _starts_ptr1, _inputs_ptr, 1)

                    let _steps_ptr := safeAdd(safeAdd(_input_ptr, mslice(_input_ptr, 4)), 4)
                    getProgSteps(_steps_ptr, sig)

                    executeGraphSteps(
                        _steps_ptr,
                        _starts_ptr1,
                        _inputs_ptr,
                        Type_steps(safeAdd(_dtype_ptr, 4)),
                        goutput_ptr
                    )
                    success := 0x01
                }
            }

            function executeGraphSteps(_steps_ptr, _starts_ptr_, _inputs_ptr, step_count, _output_ptr) {
                let _step_indexes_ptr := safeAdd(_inputs_ptr, 2048)
                let _step_starts := safeAdd(_step_indexes_ptr, 32)
                let _step_inputs_ptr := safeAdd(_step_starts, 96)

                // loop over steps & execute them
                for { let i := 0 } lt(i, step_count) { i := safeAdd(i, 1) } {
                    let _step_ptr := getProgStepPointer(safeAdd(_steps_ptr, 4), i)

                    executeGraphStep(
                        _step_ptr, _step_indexes_ptr,
                        _step_starts, _step_inputs_ptr,
                        _starts_ptr_, _inputs_ptr, i
                    )
                }
                // if eq(step_count, 7) { return (_starts_ptr_, 512) }
                // return (_step_indexes_ptr, 512)

                // write result to _output_ptr through select
                // write indexes length
                mslicestore(_step_indexes_ptr, 1, 4)
                // only 1 output now - the last one
                mslicestore(safeAdd(_step_indexes_ptr, 4), safeSub(mslice(_starts_ptr_, 4), 1), 1)

                select(
                    _step_indexes_ptr,
                    _starts_ptr_,
                    _inputs_ptr,
                    _step_starts,
                    _step_inputs_ptr
                )

                identity(_step_starts, _step_inputs_ptr, _output_ptr)
            }

            function executeGraphStep(
                _step_ptr, _step_indexes_ptr,
                _step_starts, _step_inputs_ptr,
                _starts_ptr2, _inputs_ptr, i
            ) {
                    // write step selection indexes
                    ProgStep_inputIndexes_encodeTight(_step_ptr, _step_indexes_ptr)

                    // if eq(ProgStep_typeid(_step_ptr), 0x33333335) { return (_step_indexes_ptr, 256) }

                    // if eq(ProgStep_typeid(_step_ptr), 0x33333337) { return (_step_ptr, 32) }

                    // if eq(ProgStep_typeid(_step_ptr), 0x33333335) {
                    //     if eq(ProgStep_inputIndexes(_step_ptr, 1), 0x02) { // 0000000030c0a09
                    //         return (_starts_ptr2, 512)
                    //     }
                    // }

                    // select from indexes & starts -> write at _step_inputs_ptr
                    select(_step_indexes_ptr, _starts_ptr2, _inputs_ptr, _step_starts, _step_inputs_ptr)

                    // if eq(ProgStep_typeid(_step_ptr), 0x33333335) { return (_step_starts, 256) }

                    // if eq(ProgStep_typeid(_step_ptr), 0x33333335) {
                    //     if eq(ProgStep_inputIndexes(_step_ptr, 0), 0x08) { // 0000000030c0a09
                    //         return (_step_starts, 512)
                    //     }
                    // }

                    // output is temporarily written at mem 0
                    // result also has a tuple encoding, based on structs

                    executeInternal(ProgStep_typeid_position(_step_ptr), _step_starts, 0)

                    // if eq(ProgStep_typeid(_step_ptr), 0x33333335) { return (0, 32) }

                    // if eq(ProgStep_typeid(_step_ptr), 0x33333328) {
                    //     if eq(ProgStep_inputIndexes(_step_ptr, 0), 0x08) { // 0000000030c0a09
                    //         return (0, 256)
                    //     }
                    // }

                    // if eq(ProgStep_typeid(_step_ptr), 0x33333337) {
                    //     if eq(mslice(_step_inputs_ptr, 1), 0x44) { // 0000000030c0a09
                    //         return (0, 256)
                    //     }
                    // }

                    // we add the output to _inputs_ptr & add its size to _starts_ptr
                    addGraphProgInput(0, _starts_ptr2, _inputs_ptr, 1)

                    // return (_starts_ptr2, 256)

                    // if eq(ProgStep_typeid(_step_ptr), 0x33333338) { return (_starts_ptr2, 256) }
            }

            function addGraphProgInput(source_starts, _starts_ptr, _inputs_ptr, additive) {
                //  these starts already account for what data is expected from sources
                // external to this graph - they have correct values
                let start_size := safeMul(getSize(source_starts), 4)
                let input_size := getlengthFromStarts(source_starts)

                // TODO: fix for Nothing type
                if gt(input_size, 0) {
                    let last_start_index := getlastStartsIndex(_starts_ptr)
                    let last_input_index := safeAdd(_inputs_ptr, getlengthFromStarts(_starts_ptr))
                    let source_inputs := safeAdd(getlastStartsIndex(source_starts), 4)
                    let source_count := getSize(source_starts)

                    // change number of starts
                    if eq(last_start_index, _starts_ptr) {
                        mslicestore(_starts_ptr, 0xee000000, 4)
                    }

                    addToSize(_starts_ptr, source_count)

                    // store inputs unchanged
                    mmultistore(last_input_index, source_inputs, input_size)

                    switch additive
                    case 0 {
                        // store starts unchanged
                        mmultistore(safeAdd(last_start_index, 4), safeAdd(source_starts, 4), start_size)
                    }
                    case 1 {
                        // loop through starts, to add them one by one
                        let last_end := mslice(last_start_index, 4)
                        let last_start := 0
                        for { let i := 0 } lt(i, source_count) { i := safeAdd(i, 1) } {
                            last_start_index := safeAdd(last_start_index, 4)
                            let current_start := mslice(safeAdd(safeAdd(source_starts, 4), safeMul(i, 4)), 4)
                            last_end := safeAdd(
                                last_end,
                                safeSub(current_start, last_start)
                            )
                            mslicestore(last_start_index, last_end, 4)
                            last_start := current_start
                        }
                    }
                }
            }

            function executeBaseFunction(_sig_ptr, starts_ptr, _output_ptr) -> success {
                let _input_ptr := safeAdd(starts_ptr, 96)
                success := 0x01

                switch mslice(_sig_ptr, 4)

                // byte1
                case 0x33333338 {
                    let ans := byte1()
                    // starts
                    mslicestore(_output_ptr, 0xee000001, 4)
                    mslicestore(safeAdd(_output_ptr, 4), 5, 4)
                    // inputs
                    mslicestore(safeAdd(_output_ptr, 8), 0x22000001, 4)
                    mslicestore(safeAdd(_output_ptr, 12), ans, 1)
                }

                // function dtnew(abstract_type_id, size, _primordial_matter_ptr)
                case 0x33333337 {
                    // type id, size(optional)
                    // e_g_ 220000041100000011000003000004
                    let sig_len := getSize(_input_ptr)
                    let size := mslice(safeAdd(safeAdd(_input_ptr, 8), sig_len), 3)

                    let sig_ptr := starts_ptr
                    mmultistore(sig_ptr, safeAdd(_input_ptr, 4), sig_len)

                    starts_ptr := safeAdd(starts_ptr, sig_len)
                    _input_ptr := safeAdd(_input_ptr, sig_len)

                    switch size
                    // if type is stored with a size, we don't need external inputs
                    case 0 {
                        mstore(_input_ptr, 0x00000000)
                        mstore(starts_ptr, 0x0000000000000000000000000000000000000000000000000000000000000000)
                    }
                    default {
                        mslicestore(_input_ptr, 0x11000003, 4)
                        mslicestore(safeAdd(_input_ptr, 4), size, 3)

                        mslicestore(starts_ptr, 0xee00000100000007, 8)
                    }
                    executeInternal(sig_ptr, starts_ptr, _output_ptr)
                }

                 // contig (count, b_length, b_pointer, output_ptr)
                case 0x33333335 {
                    //  count, bytes
                    // eg_ starts: 0xee000002000000070000000c
                    // eg_ inputs: 110000030000042200000111
                    // type checking count/size to be u28
                    dtrequire(eq(mslice(_input_ptr, 4), 0x11000003), 0xef)
                    let count := mslice(safeAdd(_input_ptr, 4), 3)

                    // byte type id
                    let type_header := 0x22

                    let bytes_length := mslice(safeAdd(_input_ptr, 8), 3)

                    // if eq(bytes_length, 32) { return(starts_ptr, 172) }

                    let size := safeMul(count, bytes_length)
                    // starts
                    mslicestore(_output_ptr, 0xee, 1)
                    mslicestore(safeAdd(_output_ptr, 1), 1, 3)
                    mslicestore(safeAdd(_output_ptr, 4), safeAdd(4, size), 4)
                    mslicestore(safeAdd(_output_ptr, 8), type_header, 1)
                    mslicestore(safeAdd(_output_ptr, 9), size, 3)

                    contig(count, bytes_length, safeAdd(_input_ptr, 11), safeAdd(_output_ptr, 12))
                }

                // identity function
                case 0x33333334 {
                    identity(starts_ptr, _input_ptr, _output_ptr)
                }

                // dtprod
                case 0x33333333 {
                    dtprod(_input_ptr, _output_ptr)
                }

                // map: fsig/pointer, array
                case 0x33333332 {
                    let sig_length := getSize(_input_ptr)
                    let array_ptr := safeAdd(safeAdd(_input_ptr, 4), sig_length)

                    mslicestore(_output_ptr, 0xee000001, 4)
                    mslicestore(safeAdd(_output_ptr, 8), mslice(array_ptr, 4), 4)

                    let new_size := dtmap(
                        safeAdd(_input_ptr, 512),
                        safeAdd(_input_ptr, 4),
                        array_ptr,
                        safeAdd(_output_ptr, 12)
                    )
                    mstorehead(safeAdd(_output_ptr, 4), new_size, 4)
                }

                // reduce : ffsig, array, initial value
                case 0x33333331 {
                    // e_g_ 0xee00000300000008000000160000001d
                    // 2200000433333333440000021100000300000200000511000003000001
                    let sigsize := getSize(_input_ptr)
                    let array_ptr := safeAdd(safeAdd(_input_ptr, 4), sigsize)
                    let initial_value_ptr := safeAdd(_input_ptr, mslice(safeAdd(starts_ptr, 8), 4))

                    reduce(safeAdd(_input_ptr, 512), safeAdd(_input_ptr, 4), array_ptr, initial_value_ptr, _output_ptr)
                }

                // concat - concatenates untyped values
                // used for building typed values from components -> concat does not need to have a special
                // return type - it just wraps the value in a tuple
                case 0x33333330 {
                    let count := getSize(starts_ptr)

                    mslicestore(_output_ptr, 0xee000001, 4)

                    let source_ptr := _input_ptr
                    let target_ptr := safeAdd(_output_ptr, 8)
                    let length := 0

                    for { let i := 0 } lt(i, count) { i := safeAdd(i, 1) } {
                        let length_bytes := getTypeLength(source_ptr)
                        let value_ptr := getValuesPointer(source_ptr)
                        mmultistore(target_ptr, value_ptr, length_bytes)

                        length := safeAdd(length, length_bytes)
                        source_ptr := safeAdd(value_ptr, length_bytes)
                        target_ptr := safeAdd(target_ptr, length_bytes)
                    }
                    mstorehead(safeAdd(_output_ptr, 4), length, 4)
                }

                // getTypeSignature
                case 0x33333329 {
                    let sig_len := getSignatureLength(_input_ptr)

                    // starts
                    mslicestore(_output_ptr, uconcat(0xee0000010000000822, sig_len, 3), 12)
                    mmultistore(safeAdd(_output_ptr, 12), _input_ptr, sig_len)
                }

                // curry: fsig, partial application arguments
                case 0x33333328 {
                    // 0xee0000022000000080000000x
                    // 2000004<fsig><data>
                    // TODO type checking signature
                    let _runtime_fns := safeSub(starts_ptr, 1024)

                    // first 32 bytes is the free pointer
                    let fpointer := mload(_runtime_fns)
                    if eq(fpointer, 0) {
                        fpointer := safeAdd(_runtime_fns, 32)
                    }

                    let tuple_length := curry(fpointer, starts_ptr, _input_ptr)
                    mstore(_runtime_fns, safeAdd(fpointer, tuple_length))

                    mslicestore(_output_ptr, 0xee0000010000002422000020, 12)
                    mstore(safeAdd(_output_ptr, 12), fpointer)
                }

                // type check
                case 0x33333327 {
                    // let ans := typeCheck(_calldata2, sub(calldatasize(), 4))
                }

                // insert typed value
                // 0xffffffff33333326ee0000010000000722000003777777
                case 0x33333326 {
                    // typed content -> index
                    storeValueWrap(starts_ptr, _input_ptr, _output_ptr)
                }

                // get typed value
                // 0xffffffff33333325ee000002000000080000001022000004220000031100000400000001
                case 0x33333325 {
                    // type_id, index -> typed value
                    getValueWrap(starts_ptr, _input_ptr, _output_ptr)
                }

                // count values
                // 0xffffffff33333324ee000001000000081100000422000003
                case 0x33333324 {
                    // type_id
                    // 0xee0000010000000822000004<type_id>
                    getValueCounterWrap(starts_ptr, _input_ptr, _output_ptr)
                }

                // modify typed value
                case 0x33333323 {
                    // type_id, index, new typed value -> success
                }

                // log typed value
                case 0x33333322 {
                    // typed value
                    let length := getTypeLength(starts_ptr)
                    let starts_len := getStartsLength(starts_ptr)
                    mmultistore(_output_ptr, starts_ptr, starts_len)
                    mmultistore(safeAdd(_output_ptr, starts_len), _input_ptr, length)
                    logTypedValue(_output_ptr)
                    mstore(_output_ptr, 0)
                }

                // // sendPay
                // case 0x33333321 {
                //     // address, value
                //     // 0xee000002000000180000003c11000014<address>11000020<value>
                //     dtrequire(eq(getSize(starts_ptr), 2), 0xe8)
                //     dtrequire(eq(mslice(safeAdd(starts_ptr, 4), 4), 0x18), 0xe8)
                //     dtrequire(eq(mslice(safeAdd(starts_ptr, 8), 4), 0x3c), 0xe8)
                //     dtrequire(eq(mslice(_input_ptr, 4), 0x11000014), 0xe8)
                //     dtrequire(eq(mslice(safeAdd(_input_ptr, 24), 4), 0x11000020), 0xe8)

                //     let successful := sendPay(
                //         mslice(safeAdd(_input_ptr, 4), 20),
                //         mload(safeAdd(_input_ptr, 28))
                //     )

                //     // dtrequire(eq(successful, true), 0xe8)
                //     mslicestore(_output_ptr, uconcat(0xee0000010000000511000001, successful, 1) ,13)
                // }
                // // TODO: these functions should receive a full value, not starts & inputs ?

                  // dtadd
                case 0x3333331f {
                    dtadd(_input_ptr, _output_ptr)
                }

                // dtsub
                case 0x3333331e {
                    dtsub(_input_ptr, _output_ptr)
                }

                // // dtdiv
                // case 0x3333331d {
                //     dtdiv(_input_ptr, _output_ptr)
                // }

                // cast
                case 0x3333331c {
                    // 0xee0000020000000800000010
                    // 22000004 11000020 11000004 00000001
                    // or typed value in lieu of 22000004 11000020
                    dtrequire(eq(getSize(starts_ptr), 2), 0xe7)

                    // dtrequire(eq(mslice(_input_ptr, 4), 0x22000004), 0xe6)
                    dtcast(_input_ptr, _output_ptr)
                }

                // zip_apply - sig1, array1, array2
                // applies sig1 on array1_item, array2_item
                case 0x3333331b {
                    let sig_length := getSignatureLength(safeAdd(_input_ptr, 4))
                    let array1_ptr := safeAdd(safeAdd(_input_ptr, 4), sig_length)

                    // index 3?
                    let start, arrlength := selectOneBoundaries(0, 3, starts_ptr, _input_ptr)
                    let array2_ptr := safeAdd(_input_ptr, start)

                    mslicestore(_output_ptr, 0xee000001, 4)

                    let new_size, array_length := zip_apply(safeAdd(_input_ptr, 512), safeAdd(_input_ptr, 4), array1_ptr, array2_ptr, safeAdd(_output_ptr, 12))
                    mstorehead(safeAdd(_output_ptr, 4), safeAdd(new_size, 4), 4)
                    mstorehead(safeAdd(_output_ptr, 8), uconcat(0x44, array_length, 3), 4)
                }

                // selectraw (ptr, slice_size, index)
                case 0x3333331a {
                    // 0xee000003000000070000000e0000001a
                    // 1100000300000411000003000002220000084400000311000004
                    let arg1_size := getSize(_input_ptr)
                    let slice_size := mslice(safeAdd(_input_ptr, 4), arg1_size)
                    let _ptr := safeAdd(safeAdd(_input_ptr, 4), arg1_size)
                    let index := mslice(safeAdd(_ptr, 4), getSize(_ptr))
                    _ptr := safeAdd(safeAdd(_ptr, 4), getSize(_ptr))

                    let item_ptr := selectraw(_ptr, slice_size, index)
                    mslicestore(_output_ptr, uconcat(0xee000001, safeAdd(slice_size, 4), 4), 8)
                    mslicestore(safeAdd(_output_ptr, 8), uconcat(0x22, slice_size, 3), 4)
                    mmultistore(safeAdd(_output_ptr, 12), item_ptr, slice_size)
                }

                default {
                    success := 0x00
                }
            }

            function executeVirtualFunction(sig_ptr, starts_ptr, _output_ptr) -> success {
                let _input_ptr := safeAdd(starts_ptr, 96)
                let sig := mload(sig_ptr)
                success := 0x00

                if lt(sig, 10000000) {
                   // we have a tuple at this pointer with sig, data
                   if eq(mslice(sig, 2), 0xfefe) {
                        let temp_ptr := safeAdd(_input_ptr, 2000)

                        // arguments from virtual function come first

                        // temporarily store external input data
                        identity(starts_ptr, _input_ptr, temp_ptr)

                        mstore(starts_ptr, 0x00)
                        mstore(_input_ptr, 0x00)

                        // copy virtual function input in starts & input
                        addGraphProgInput(safeAdd(sig, 6), starts_ptr, _input_ptr, 0)

                        // add external input data to starts & input
                        addGraphProgInput(temp_ptr, starts_ptr, _input_ptr, 1)
                        // return (add(sig, 2), 32)
                        // execute funcsig
                        executeInternal(safeAdd(sig, 2), starts_ptr, _output_ptr)

                        success := 0x01
                    }
                }
            }

            function dtmap(internal_starts, sig_ptr, array_ptr, _output_ptr) -> new_size {
                // let internal_starts := add(_input_ptr, 512)
                let internal_inputs := safeAdd(internal_starts, 96)
                let internal_output := safeAdd(internal_inputs, 128)

                let array_values := getValuesPointer(array_ptr)
                let item_size := getSize(safeSub(array_values, 4))
                let array_length := getSize(array_ptr)
                let current_output_ptr := safeAdd(_output_ptr, 4)
                let newtypeid := 0
                new_size := 8

                for { let i:= 0 } lt(i, array_length) { i := safeAdd(i, 1) } {
                    mslicestore(internal_starts, 0xee000001, 4)
                    mslicestore(safeAdd(internal_starts, 4), safeAdd(item_size, 4), 4)

                    mslicestore(internal_inputs, mslice(safeSub(array_values, 4), 4), 4) // store typeid
                    mmultistore(safeAdd(internal_inputs, 4), safeAdd(array_values, safeMul(i, item_size)), item_size)

                    executeInternal(sig_ptr, internal_starts, internal_output)

                    // remove sig
                    let newitem_size := safeSub(mslice(safeAdd(internal_output, 4), 4), 4)
                    mmultistore(current_output_ptr, safeAdd(internal_output, 12), newitem_size)

                    current_output_ptr := safeAdd(current_output_ptr, newitem_size)
                    new_size := safeAdd(new_size, newitem_size)
                    if iszero(newtypeid) { newtypeid := mslice(safeAdd(internal_output, 8), 4) }
                }
                mstorehead(_output_ptr, newtypeid, 4)
            }

            function zip_apply(internal_starts, sig_ptr, array1_ptr, array2_ptr, output_ptr) -> new_size, array_length {
                let internal_inputs := safeAdd(internal_starts, 96)
                let internal_output := safeAdd(internal_inputs, 128)

                let array1_values := getValuesPointer(array1_ptr)
                let array2_values := getValuesPointer(array2_ptr)
                // let item1_size := getSize(sub(array1_values, 4))
                // let item2_size := getSize(sub(array2_values, 4))
                array_length := min(getSize(array1_ptr), getSize(array2_ptr))

                // mslicestore(output_ptr, uconcat(0x44, array_length, 3), 4)

                // leave space for element signature
                let current_output_ptr := safeAdd(output_ptr, 4)
                let newtypeid := 0
                new_size := 4

                for { let i:= 0 } lt(i, array_length) { i := safeAdd(i, 1) } {
                    zip_apply_meld(internal_starts, internal_inputs, i, array1_values, array2_values)

                    executeInternal(sig_ptr, internal_starts, internal_output)

                    // remove sig
                    let newitem_size := safeSub(mslice(safeAdd(internal_output, 4), 4), 4)

                    mmultistore(current_output_ptr, safeAdd(internal_output, 12), newitem_size)
                    current_output_ptr := safeAdd(current_output_ptr, newitem_size)
                    new_size := safeAdd(new_size, newitem_size)
                    if iszero(newtypeid) { newtypeid := mslice(safeAdd(internal_output, 8), 4) }
                }
                mstorehead(output_ptr, newtypeid, 4)
            }

            function zip_apply_meld(internal_starts, internal_inputs, i, array1_values, array2_values) {
                let item1_size := getSize(safeSub(array1_values, 4))
                let item2_size := getSize(safeSub(array2_values, 4))
                let input_offset := 0
                mslicestore(internal_starts, 0xee000002, 4)
                mslicestore(safeAdd(internal_starts, 4), safeAdd(item1_size, 4), 4)
                mslicestore(safeAdd(internal_starts, 8), safeAdd(item2_size, 4), 4)

                // add element from first array
                mslicestore(internal_inputs, mslice(safeSub(array1_values, 4), 4), 4)
                input_offset := safeAdd(internal_inputs, 4)
                mmultistore(input_offset, safeAdd(array1_values, safeMul(i, item1_size)), item1_size)

                // add element from second array
                input_offset := safeAdd(input_offset, item1_size)
                mslicestore(input_offset, mslice(safeSub(array2_values, 4), 4), 4)
                input_offset := safeAdd(input_offset, 4)
                mmultistore(input_offset, safeAdd(array2_values, safeMul(i, item2_size)), item2_size)
            }

            function curry(fpointer, starts_ptr, _input_ptr) -> tuple_length {
                let starts_len := safeSub(getStartsLength(starts_ptr), 4)
                tuple_length := getTypeLength(starts_ptr)
                let args_count := safeSub(getSize(starts_ptr), 1)

                // virtual function marker
                mslicestore(fpointer, 0xfefe, 2)

                let sig_length := getSize(_input_ptr)
                mmultistore(safeAdd(fpointer, 2), safeAdd(_input_ptr, 4), sig_length)
                let offseted := safeAdd(safeAdd(fpointer, 2), sig_length)

                let select_ptr := allocate(safeAdd(4, args_count))
                mslicestore(select_ptr, args_count, 4)

                for { let i := 0 } lt(i, args_count) { i := safeAdd(i, 1) } {
                    mslicestore(safeAdd(safeAdd(select_ptr, 4), i), safeAdd(i, 1), 1)
                }

                let inputs_ptr := allocate(tuple_length)

                select(
                    select_ptr,
                    starts_ptr,
                    _input_ptr,
                    offseted,
                    inputs_ptr
                )

                tuple_length := getTypeLength(offseted)
                mmultistore(safeAdd(offseted, starts_len), inputs_ptr, tuple_length)
                tuple_length := safeAdd(tuple_length, starts_len)
            }

            function dtrequire(cond, error_bytes) {
                if eq(cond, 0) {
                    mslicestore(0, error_bytes, 1)
                    revert(0, 1)
                    // return (0, 1)
                }
            }

            function uconcat(a, b, length_b) -> c {
                c := safeAdd(shl(safeMul(length_b, 8), a), b)
            }

            function mslicestore(_ptr, val, length) {
                let slot := 32
                mstore(_ptr, shl(safeMul(safeSub(slot, length), 8), val))
            }

            function sslicestore(storageKey, val, length) {
                let slot := 32
                sstore(storageKey, shl(safeMul(safeSub(slot, length), 8), val))
            }

            // Use carefully - replaces head bytes4 in a byte32 chunk
            function mstorehead(_ptr, value, length) {
                let slot := 32
                let temp := safeAdd(
                    mslice(safeAdd(_ptr, 4), safeSub(slot, 4)),
                    shl(safeMul(safeSub(slot, length), 8), value)
                )
                mstore(_ptr, temp)
            }

            //  0x11000004___
            function mstoremiddle(_ptr, start, value, length) {
                let slot := 32
                let end := safeAdd(start, length)
                let valoffset := safeSub(safeSub(slot, length), start)
                let temp := safeAdd(
                    safeAdd(
                        mslice(safeAdd(_ptr, end), safeSub(slot, end)),
                        shl(safeMul(valoffset, 8), value)
                    ),
                    shl(safeMul(safeSub(slot, start), 8), mslice(_ptr, 1))
                )
                mstore(_ptr, temp)
            }

            function mmultistore(_ptr_target, _ptr_source, sizeBytes) {
                if gt(sizeBytes, 0) {
                    let slot := 32
                    let storedBytes := 0
                    
                    for {} lt(storedBytes, sizeBytes) {} {
                        let remaining := sub(sizeBytes, storedBytes)
                        switch gt(remaining, 31)
                        case 1 {
                            mstore(safeAdd(_ptr_target, storedBytes), mload(safeAdd(_ptr_source, storedBytes)))
                            storedBytes := add(storedBytes, 32)
                        }
                        case 0 {
                            mslicestore(
                                safeAdd(_ptr_target, storedBytes),
                                mslice(safeAdd(_ptr_source, storedBytes), remaining),
                                remaining
                            )
                        }
                    }
                }
            }

            function allocate(size) -> ptr {
                ptr := mload(0x40)
                if iszero(ptr) { ptr := 0x60 }
                mstore(0x40, safeAdd(ptr, size))
            }

            function min(a, b) -> c {
                switch lt(a, b)
                case 1 { c := a }
                case 0 { c := b }
            }

            function max(a, b) -> c {
                switch gt(a, b)
                case 1 { c := a }
                case 0 { c := b }
            }

            function is_not_none(index, starts_ptr) -> ans {
                // index - end
                let start, end := boundsFromStarts(index, starts_ptr)
                ans := eq(iszero(safeSub(end, start)), 0x00)
            }

            function byte1() -> ans {
                ans := 0x00
            }

             function dtadd(pointer, _output_ptr) {
                let a_size :=  getSize(pointer)
                let b_ptr := safeAdd(pointer, safeAdd(4, a_size))
                let b_size := getSize(b_ptr)
                let a := mslice(safeAdd(pointer, 4), a_size)
                let b := mslice(safeAdd(b_ptr, 4), b_size)
                let res_size := max(a_size, b_size)

                mslicestore(_output_ptr, 0xee000001, 4)
                mslicestore(safeAdd(_output_ptr, 4), safeAdd(4, res_size), 4)
                mslicestore(safeAdd(_output_ptr, 8), safeAdd(0x11000000, res_size), 4)
                mslicestore(safeAdd(_output_ptr, 12), safeAdd(a, b), res_size)
            }

            function dtsub(pointer, _output_ptr) {
                let a_size :=  getSize(pointer)
                let b_ptr := safeAdd(pointer, safeAdd(4, a_size))
                let b_size := getSize(b_ptr)
                let a := mslice(safeAdd(pointer, 4), a_size)
                let b := mslice(safeAdd(b_ptr, 4), b_size)
                let res_size := max(a_size, b_size)

                mslicestore(_output_ptr, 0xee000001, 4)
                mslicestore(safeAdd(_output_ptr, 4), safeAdd(4, res_size), 4)
                mslicestore(safeAdd(_output_ptr, 8), safeAdd(0x11000000, res_size), 4)
                mslicestore(safeAdd(_output_ptr, 12), safeSub(a, b), res_size)
            }

            function dtprod(pointer, _output_ptr) {
                let a_size :=  getSize(pointer)
                let b_ptr := safeAdd(pointer, safeAdd(4, a_size))
                let b_size := getSize(b_ptr)
                let a := mslice(safeAdd(pointer, 4), a_size)
                let b := mslice(safeAdd(b_ptr, 4), b_size)
                let res_size := max(a_size, b_size)

                mslicestore(_output_ptr, 0xee000001, 4)
                mslicestore(safeAdd(_output_ptr, 4), safeAdd(4, res_size), 4)
                mslicestore(safeAdd(_output_ptr, 8), safeAdd(0x11000000, res_size), 4)
                mslicestore(safeAdd(_output_ptr, 12), safeMul(a, b), res_size)
            }

            function dtdiv(pointer, _output_ptr) {
                let a_size :=  getSize(pointer)
                let b_ptr := safeAdd(pointer, safeAdd(4, a_size))
                let b_size := getSize(b_ptr)
                let a := mslice(safeAdd(pointer, 4), a_size)
                let b := mslice(safeAdd(b_ptr, 4), b_size)
                let res_size := max(a_size, b_size)

                mslicestore(_output_ptr, 0xee000001, 4)
                mslicestore(safeAdd(_output_ptr, 4), safeAdd(4, res_size), 4)
                mslicestore(safeAdd(_output_ptr, 8), safeAdd(0x11000000, res_size), 4)
                mslicestore(safeAdd(_output_ptr, 12), safeDiv(a, b), res_size)
            }

            function identity(starts_ptr, _input_ptr, _output_ptr) {
                let input_size := getlengthFromStarts(starts_ptr)
                let starts_size := getStartsLength(starts_ptr)

                mmultistore(_output_ptr, starts_ptr, starts_size)
                mmultistore(safeAdd(_output_ptr, starts_size), _input_ptr, input_size)
            }

            function contig(count, b_length, b_pointer, output_ptr) {
                let slot := 32
                for { let i := 0 } lt(i, count) { i := safeAdd(i, 1) } {
                    let ans_ptr := safeAdd(output_ptr, safeMul(b_length, i))
                    mmultistore(ans_ptr, b_pointer, b_length)
                }
            }

            function dtif(condition, t_output, f_output) -> ans {
                switch condition
                case 1 {
                    ans := t_output
                }
                case 0 {
                    ans := f_output
                }
            }

            // type_id1, value_ptr, type_id2, answ_ptr
            function dtcast(input_ptr, output_ptr) {
                // TODO fix this hack
                let to_type_ptr := input_ptr
                let from_type_ptr := safeAdd(safeAdd(to_type_ptr, getSize(input_ptr)), 4)

                if eq(mslice(input_ptr, 4), 0x22000004) {
                    to_type_ptr := safeAdd(input_ptr, 4)
                    from_type_ptr := safeAdd(to_type_ptr, 4)
                }

                let value_ptr := safeAdd(from_type_ptr, 4)
                let abstract_type_id := mslice(to_type_ptr, 1)

                let to_size := getSize(to_type_ptr)
                let from_size := getSize(from_type_ptr)

                // casting size from lt -> gt is allowed if
                // the actual value size < to_sie
                if lt(to_size, from_size) {
                    let index := firstSignificantByte(safeSub(from_size, to_size), value_ptr)
                    from_size := safeSub(from_size, index)
                    value_ptr := safeAdd(value_ptr, index)
                }

                mslicestore(output_ptr, 0xee000001, 4)
                mslicestore(safeAdd(output_ptr, 4), safeAdd(to_size, 4), 4)
                mslicestore(safeAdd(output_ptr, 8), mslice(to_type_ptr, 4), 4)

                switch abstract_type_id
                // right pad for uint
                case 0x11 {
                    dtcastToUint(from_type_ptr, from_size, to_size, value_ptr, safeAdd(output_ptr, 12))
                }
                case 0x12 {
                    dtcastToInt(from_type_ptr, from_size, to_size, value_ptr, safeAdd(output_ptr, 12))
                }
                // left pad for byte
                case 0x22 {
                    dtcastToBytes(from_type_ptr, from_size, to_size, value_ptr, safeAdd(output_ptr, 12))
                }
                default {
                    dtrequire(0x00, 0xea)
                }
            }

            function dtcastToInt(from_type_ptr, from_size, to_size, value_ptr, output_ptr) {
                dtrequire(gt(safeAdd(to_size, 1), from_size), 0xea)

                let canCast := eq(mslice(from_type_ptr, 1), 0x11)
                if canCast {
                    if isFirstBitOne(value_ptr) {
                        dtrequire(0x00, 0xe7)
                    }
                }

                if iszero(canCast) {
                    canCast := eq(mslice(from_type_ptr, 1), 0x12)
                }

                dtrequire(eq(canCast, 0x01), 0xea)

                let diff := safeSub(to_size, from_size)
                let isnegative := isFirstBitOne(value_ptr)

                // left pad for uint
                switch isnegative
                case 0 {
                    mslicestore(output_ptr, 0, diff)
                    mmultistore(safeAdd(output_ptr, diff), value_ptr, from_size)
                }
                case 1 {
                    mslicestore(output_ptr, 0xff, diff)
                    mmultistore(safeAdd(output_ptr, diff), value_ptr, from_size)
                }
            }

            function dtcastToUint(from_type_ptr, from_size, to_size, value_ptr, output_ptr) {
                // to_size >= from_size
                dtrequire(gt(safeAdd(to_size, 1), from_size), 0xea)

                let canCast := eq(mslice(from_type_ptr, 1), 0x12)
                if eq(canCast, 0x01) {
                    dtrequire(eq(isFirstBitOne(value_ptr), 0x00), 0xe8)
                }
                if iszero(canCast) {
                    canCast := eq(mslice(from_type_ptr, 1), 0x11)
                }
                dtrequire(eq(canCast, 0x01), 0xe7)

                let diff := safeSub(to_size, from_size)

                // left pad for uint
                mslicestore(output_ptr, 0, diff)
                mmultistore(safeAdd(output_ptr, diff), value_ptr, from_size)
            }

            function dtcastToBytes(from_type, from_size, to_size, value_ptr, output_ptr) {
                dtrequire(gt(to_size, from_size), 0xea)
                let diff := safeSub(to_size, from_size)

                // right pad for byte
                mmultistore(output_ptr, value_ptr, from_size)
                mslicestore(safeAdd(output_ptr, from_size), 0, diff)
            }

            function isFirstBitOne(value_ptr) -> isbitone {
                let stbyte := mslice(value_ptr, 1)
                isbitone := gt(stbyte, 0x7f)
            }

            function firstSignificantByte(maxindex, value_ptr) -> offset {
                let current_byte := mslice(value_ptr, 1)
                for { } eq(current_byte, 0x00) { } {
                    offset := safeAdd(offset, 1)
                    current_byte := mslice(safeAdd(value_ptr, offset), 1)
                    if gt(offset, maxindex) {
                        current_byte := 0x11
                        offset := safeSub(offset, 1)
                    }
                }
            }

            function selectraw(data_ptr, slice_size, index) -> item_ptr {
                switch index
                case 0 {
                    item_ptr := data_ptr
                }
                default {
                    item_ptr := selectraw(safeAdd(data_ptr, slice_size), slice_size, safeSub(index, 1))
                }
            }

            // TODO: rewrite this more efficient
            function select(select_ptr, starts_ptr, inputs_ptr, _output_starts, _output_ptr) {
                let select_length := mslice(select_ptr, 4)
                let select_pointer := safeAdd(select_ptr, 4)
                let starts_pointer := safeAdd(starts_ptr, 4)
                let output_pointer := _output_ptr
                // if eq(mslice(select_ptr, 4), 2) { return (inputs_ptr, 128) }
                selectInner(select_pointer, starts_pointer, inputs_ptr, _output_starts, output_pointer, select_length)
            }

            function selectInner(select_ptr, starts_ptr, inputs_ptr, _output_starts, _output_ptr, select_length) {
                let sum_length := 0

                // add tuple type with size 0xee<size byte4>
                mslicestore(_output_starts, 0xee, 1)
                mslicestore(safeAdd(_output_starts, 1), select_length, 3)

                // if eq(select_length, 2) { return (inputs_ptr, 128) }
                // return (_output_starts, 64)

                for { let i := 0 } lt(i, select_length) { i := safeAdd(i, 1) } {
                    let index := mslice(safeAdd(select_ptr, safeMul(i, 1)), 1)
                    let start, length := selectOneBoundaries(select_ptr, index, starts_ptr, inputs_ptr)

                    // if eq(select_length, 2) { mstore(0, length) return (0, 32) }
                    // if eq(select_length, 2) { return (add(inputs_ptr, start), length) }

                    // add new end
                    mslicestore(safeAdd(safeAdd(_output_starts, 4), safeMul(i, 4)), safeAdd(sum_length, length), 4)

                    // add new input
                    mmultistore(safeAdd(_output_ptr, sum_length), safeAdd(inputs_ptr, start), length)

                    sum_length := safeAdd(sum_length, length)
                    // if eq(select_length, 2) { return (_output_starts, 64) }
                }
                // if eq(select_length, 2) { return (_output_starts, 64) }
            }

            function selectOneBoundaries(select_ptr, index, _starts_ptr, inputs_ptr) -> start, length {
                // enforced rule for making the selector dynamic, based on ProgInput values
                // for implementing Union type
                if gt(index, 128) {
                    index := safeSub(255, index)

                    let st, len := selectOneBoundaries(select_ptr, index, _starts_ptr, inputs_ptr)
                    let _ptr := safeAdd(inputs_ptr, st)
                    // Runtime index needs to be a uint
                    dtrequire(eq(mslice(_ptr, 1), 0x22), 0xed)
                    // Add 1, to avoid choosing the selector itself
                    index := safeAdd(mslice(safeAdd(_ptr, 4), safeSub(len, 4)), 1)
                }
                let end := 0

                // TODO: vodoo
                // start, end := boundsFromStarts(index, _starts_ptr)

                start := 0
                if gt(index, 0) {
                    start := mslice(safeAdd(_starts_ptr, safeMul(safeSub(index, 1), 4)), 4)
                }
                end := mslice(safeAdd(_starts_ptr, safeMul(index, 4)), 4)

                length := safeSub(end, start)
            }

            function reduce(new_starts_ptr, sig_ptr, array_ptr, accumulator_ptr, _output_ptr) {
                let new_inputs_ptr := safeAdd(new_starts_ptr, 96)
                let internal_output := safeAdd(new_inputs_ptr, 128)

                let len := getSize(array_ptr)
                let item_size := getTypeLength(safeAdd(array_ptr, 4))
                let array_values := getValuesPointer(array_ptr)

                let accum_ptr := accumulator_ptr
                let accum_length := safeAdd(getTypeLength(accum_ptr), 4)

                mslicestore(new_starts_ptr, 0xee000002, 4)

                for { let i:= 0 } lt(i, len) { i := safeAdd(i, 1) } {
                    // if eq(i, 1) { return (array_values, 64) }
                    // starts_ptr & inputs_ptr contain initial/prev value + current item
                    let current_value_ptr := reduceStepHead(accum_ptr, accum_length, item_size, new_starts_ptr, new_inputs_ptr)

                    // add current element type & value
                    mslicestore(current_value_ptr, mslice(safeAdd(array_ptr, 4), 4), 4)
                    mmultistore(safeAdd(current_value_ptr, 4), safeAdd(array_values, safeMul(i, item_size)), item_size)

                    mstore(_output_ptr, 0)
                    // if eq(i, 0) { return (new_inputs_ptr, 64) }
                    executeInternal(sig_ptr, new_starts_ptr, _output_ptr)
                    

                    accum_length := safeAdd(getTypeLength(safeAdd(_output_ptr, 8)), 4)
                    mmultistore(accum_ptr, safeAdd(_output_ptr, 8), accum_length)
                    mstore(0, len)
                }
                // mstore(0, 66)
                // return (0, 32)
                reduceResult(_output_ptr, accum_ptr, accum_length)
            }

            // sets: updates both starts, inputs length, accum value in inputs
            function reduceStepHead(accum_ptr, accum_length, item_size, new_starts_ptr, new_inputs_ptr) -> current_value_ptr {
                mslicestore(safeAdd(new_starts_ptr, 4), accum_length, 4)
                mslicestore(safeAdd(new_starts_ptr, 8), safeAdd(safeAdd(accum_length, item_size), 4), 4)
                mmultistore(new_inputs_ptr, accum_ptr, accum_length)
                current_value_ptr := safeAdd(new_inputs_ptr, accum_length)
            }

            function reduceResult(_output_ptr, accum_ptr, accum_length) {
                mslicestore(_output_ptr, 0xee000001, 4)
                mslicestore(safeAdd(_output_ptr, 4), accum_length, 4)
                mmultistore(safeAdd(_output_ptr, 8), accum_ptr, accum_length)
            }

            function boundsFromStarts(index, _starts_ptr) -> start, end {
                start := 0
                if gt(index, 0) {
                    start := mslice(safeAdd(_starts_ptr, safeMul(safeSub(index, 1), 4)), 4)
                }
                end := mslice(safeAdd(_starts_ptr, safeMul(index, 4)), 4)
            }

            function decomposeType(sig) -> type_head, size, rest {
                let rsig := sig
                if gt(sig, 0xffffffff) {
                    // TODO: fix this hack for array sig -> sig needs to be a pointer ____ or something else
                    rsig := shr(32, and(sig, 0xffffffff00000000))
                    rest := and(sig, 0x00000000ffffffff)
                }

                type_head := and(rsig, 0xff000000)
                size := and(rsig, 0x00ffffff)
            }

            // Only gets the small abstract type sig
            function getSig(_ptr) -> _dtsig {
                _dtsig := mslice(_ptr, 1)
            }

            function getSignatureLength(_ptr) -> _len {
                let size := getSize(_ptr)
                switch size
                case 0 {
                    _len := 4
                }
                default {
                    switch mslice(_ptr, 1)
                    case 0x44 {
                        _len := 8
                    }
                    case 0x45 {
                        _len := safeAdd(_len, getSignatureLength(safeAdd(_ptr, 4)))
                    }
                    default {
                        _len := 4
                    }
                }
            }

            function getTypeSignatureBase(_ptr) -> _dtsig {
                _dtsig := mslice(_ptr, 4)
            }

            function getSize(_ptr) -> _size {
                _size := mslice(safeAdd(_ptr, 1), 3)
            }

            function addToSize(_ptr, addition) {
                let size := safeAdd(getSize(_ptr), addition)
                mstoremiddle(_ptr, 1, size, 3)
            }

            function getlastStartsIndex(_starts_ptr) -> _index_ptr {
                let size := getSize(_starts_ptr)
                _index_ptr := safeAdd(_starts_ptr, safeMul(size, 4))
            }

            function getTupleItem(tuple_ptr, index) -> item_ptr, length {
                let input_ptr := getValuesPointer(tuple_ptr)
                let start := 0
                start, length := selectOneBoundaries(0, index, tuple_ptr, input_ptr)
                item_ptr := safeAdd(input_ptr, start)
            }

            function getStartsLength(_starts_ptr) -> _length {
                let size := getSize(_starts_ptr)
                _length := safeAdd(safeMul(size, 4), 4)
            }

            function getlengthFromStarts(_starts_ptr) -> _length {
                let last_index := getlastStartsIndex(_starts_ptr)
                _length := mslice(last_index, 4)
                if eq(getSize(_starts_ptr), 0) {
                    _length := 0
                }
            }

            function getValuesPointer(_starts_ptr) -> _index {
                let dtsig := mslice(_starts_ptr, 1)
                switch dtsig
                case 0xee {
                    _index := safeAdd(getlastStartsIndex(_starts_ptr), 4)
                }
                case 0x44 {
                    _index := getValuesPointer(safeAdd(_starts_ptr, 4))
                }
                default {
                    _index := safeAdd(_starts_ptr, 4)
                }
            }

            function getTypeLength(_starts_ptr) -> _length {
                let dtsig := getSig(_starts_ptr)
                switch dtsig
                case 0xee {
                    _length := getlengthFromStarts(_starts_ptr)
                }
                case 0x44 {
                    let size := getSize(_starts_ptr)
                    _length := safeMul(size, getTypeLength(safeAdd(_starts_ptr, 4)))
                }
                case 0x45 {
                    let size := getSize(_starts_ptr)
                    _length := safeMul(size, getTypeLength(safeAdd(_starts_ptr, 4)))
                }
                default {
                    _length := getSize(_starts_ptr)
                }
            }

            function storeValueWrap(starts_ptr, input_ptr, _output_ptr) {
                // typed content -> index
                // content is in a tuple 0xee000001<length><typed_value>
                // add length for storage
                // let length := mslice(add(_pointer, 4), 4)
                let length := getTypeLength(starts_ptr)
                let type_id := mslice(input_ptr, 4)

                // // TODO - better mem management?
                mslicestore(_output_ptr, length, 4)
                mmultistore(safeAdd(_output_ptr, 4), input_ptr, length)

                let index := storeValue(type_id, _output_ptr)
                mstore(_output_ptr, 0)
                mslicestore(_output_ptr, uconcat(0xee0000010000000811000004, index, 4), 16)
            }

            function getValueWrap(starts_ptr, input_ptr, _output_ptr) {
                // type_id, index -> typed value
                // content is in a tuple 0xee000001000000080000001022000004<type_id>11000004<index>
                dtrequire(eq(getSize(starts_ptr), 2), 0xe9)
                dtrequire(eq(mslice(safeAdd(starts_ptr, 4), 4), 8), 0xe9)
                dtrequire(eq(mslice(safeAdd(starts_ptr, 8), 4), 16), 0xe9)
                dtrequire(eq(mslice(input_ptr, 4), 0x22000004), 0xe9)
                dtrequire(eq(mslice(safeAdd(input_ptr, 8), 4), 0x11000004), 0xe9)

                let type_id := mslice(safeAdd(input_ptr, 4), 4)
                let index := mslice(safeAdd(input_ptr, 12), 4)
                let data_len_ptr := safeAdd(_output_ptr, 4)
                // mslicestore(_output_ptr, 0xee000001, 4)
                getValue(data_len_ptr, type_id, index)
                mstorehead(_output_ptr, 0xee000001, 4)
            }

            function getValueCounterWrap(starts_ptr, input_ptr, _output_ptr) {
                // type_id
                // 0xee0000010000000822000004<type_id>
                dtrequire(eq(mslice(safeAdd(starts_ptr, 4), 4), 8), 0xe9)
                dtrequire(eq(mslice(input_ptr, 4), 0x11000004), 0xe9)

                let type_id := mslice(safeAdd(input_ptr, 4), 4)

                let count := getValueCounter(type_id)
                mslicestore(_output_ptr, uconcat(0xee0000010000000811000004, count, 4), 16)
            }

            function storeType(_pointer, mapKey) {
                storeData(_pointer, mappingTypeKey(mapKey))
            }

            function storeInput(_pointer, mapKey) {
                storeData(_pointer, mappingProgInputKey(mapKey))
            }

            function storeProgSteps(_pointer, mapKey) {
                storeData(_pointer, mappingProgStepsKey(mapKey))
            }

            function storeCurried(_pointer, mapKey) {
                storeData(_pointer, mappingCurriedKey(mapKey))
            }

            function getType(_pointer, mapKey) {
                getStoredData(_pointer, mappingTypeKey(mapKey))
            }

            function getInput(_pointer, mapKey) {
                getStoredData(_pointer, mappingProgInputKey(mapKey))
            }

            function getProgSteps(_pointer, mapKey) {
                getStoredData(_pointer, mappingProgStepsKey(mapKey))
            }

            // does not contain the steps size
            function getProgStepPointer(_pointer, index) -> _new_ptr {
                _new_ptr := _pointer
                for { let i := 0 } lt(i, index) { i := safeAdd(i, 1) } {
                    let input_indexes_length := mslice(safeAdd(_new_ptr, 4), 4)
                    _new_ptr := safeAdd(safeAdd(_new_ptr, 8), safeMul(input_indexes_length, 1))
                }
            }

            function getCurried(_pointer, mapKey) {
                getStoredData(_pointer, mappingCurriedKey(mapKey))
            }

            function updateValueCounter(type_id) {
                let count := getValueCounter(type_id)
                sstore(valueCountKey(type_id), safeAdd(count, 1))
            }

            function getValueCounter(type_id) -> _count {
                _count := sload(valueCountKey(type_id))
            }

            // expects a length before the type
            function storeValue(type_id, _pointer) -> index {
                // TODO: check if type is valid
                index := safeAdd(getValueCounter(type_id), 1)
                storeData(_pointer, valueKey(type_id, index))
                updateValueCounter(type_id)
                logTypedValue(safeAdd(_pointer, 4))
            }

            function getValue(_pointer, type_id, index) {
                getStoredData(_pointer, valueKey(type_id, index))
                // TODO check if type_ids are the same & content is valid
            }

            function hashTypedValue(_pointer) -> _hash {
                let length := getTypeLength(_pointer)
                _hash := keccak256(_pointer, length)
            }

            function logTypedValue(_pointer) {
                let type_id := mslice(_pointer, 4)
                let hash := hashTypedValue(_pointer)
                mstore(0, hash)
                log1(0, 32, type_id)
            }

            function logInsertSignature(sig) {
                let insertTopic := 0x1111111111111111111111111111111111111111111111111111111111111111
                log2(0, 0, insertTopic, sig)
            }

            // function sendPay(addr, value) -> success {
            //     success := call(gas(), addr, value, 0, 0, 0, 0)
            // }

            function updateRegistrationCounter() {
                let count := getRegistrationCounter()
                sstore(mappingRegistrationCountKey(), safeAdd(count, 1))
            }

            function getRegistrationCounter() -> _count {
                _count := sload(mappingRegistrationCountKey())
            }

            // expects a length before the type
            function storeRegisteredAddress(_pointer) -> index {
                // TODO: check if type is valid
                index := safeAdd(getRegistrationCounter(), 1)
                sstore(mappingRegistrationKey(index), mslice(_pointer, 24))
                updateRegistrationCounter()
            }

            function getRegisteredAddress(index) -> addr {
                addr := shl(64, sload(mappingRegistrationKey(index)))
                // TODO check if type_ids are the same & content is valid
            }

            function storeData(_pointer, storageKey) {
                let slot := 32
                let sizeBytes := safeAdd(mslice(_pointer, 4), 4)
                let storedBytes := 0
                let index := 0

                
                    
                for {} lt(storedBytes, sizeBytes) {} {
                    let remaining := sub(sizeBytes, storedBytes)
                    switch gt(remaining, 31)
                    case 1 {
                        sstore(safeAdd(storageKey, index), mload(safeAdd(_pointer, storedBytes)))
                        storedBytes := add(storedBytes, 32)
                        index := add(index, 1)
                    }
                    case 0 {
                        if gt(remaining, 0) {
                            sslicestore(safeAdd(storageKey, index), mslice(safeAdd(_pointer, storedBytes), remaining), remaining)
                        }
                    }
                }
            }

            function getStoredData(_pointer, storageKey) {
                let slot := 32

                // read first storage slot, for the length
                mstore(_pointer, sload(storageKey))

                let sizeBytes := mslice(_pointer, 4)
                let loadedData := safeSub(slot, 4)
                if gt(sizeBytes, loadedData) {
                    sizeBytes := safeSub(sizeBytes, loadedData)
                    let storedBytes := 0
                    let index := 0
                    
                    for {} lt(storedBytes, sizeBytes) {} {
                        let remaining := sub(sizeBytes, storedBytes)
                        switch gt(remaining, 31)
                        case 1 {
                            mstore(safeAdd(_pointer, storedBytes), sload(safeAdd(storageKey, safeAdd(index, 1))))
                            storedBytes := add(storedBytes, 32)
                            index := add(index, 1)
                        }
                        case 0 {
                            if gt(remaining, 0) {
                                mstore(safeAdd(_pointer, storedBytes), sload(safeAdd(storageKey, safeAdd(index, 1))))
                            }
                        }
                    }
                }
            }

            function mappingTypeKey(key) -> storageKey {
                storageKey := mappingStorageKey(0, key)
            }

            function mappingProgInputKey(key) -> storageKey {
                storageKey := mappingStorageKey(1, key)
            }

            function mappingProgStepsKey(key) -> storageKey {
                storageKey := mappingStorageKey(2, key)
            }

            function mappingCurriedKey(key) -> storageKey {
                storageKey := mappingStorageKey(3, key)
            }

            function valueCountKey(type_id) -> storageKey {
                storageKey := mappingStorageKey(4, type_id)
            }

            function valueKey(type_id, index) -> storageKey {
                storageKey := mappingStorageKey2(5, type_id, index)
            }

            function mappingRegistrationCountKey() -> storageKey {
                storageKey := 6
            }

            function mappingRegistrationKey(index) -> storageKey {
                storageKey := mappingStorageKey(7, index)
            }

             // mapping(bytes32(max) => *)
            function mappingStorageKey(storageIndex, key) -> storageKey {
                mstore(0, key) 
                mstore(add(0,32), storageIndex)
                storageKey := keccak256(0, 64)
            }

            // mapping(bytes32(max) => mapping(bytes32(max) => *)
            function mappingStorageKey2(storageIndex, key1, key2) -> storageKey {
                mstore(0, key1)
                mstore(add(0,32), storageIndex)
                mstore(add(0,64), key2)
                mstore(96, keccak256(0, 64))
                storageKey := keccak256(64, 64)
            }
        }
    }
}
