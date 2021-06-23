/*******************************************************
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *******************************************************/


object "c12_92" {
    code {
        mstore(64, 128)
        if callvalue() { revert(0, 0) }

        constructor_c12_92()

        codecopy(0, dataoffset("c12_92_deployed"), datasize("c12_92_deployed"))

        return(0, datasize("c12_92_deployed"))

        function constructor_c12_92() {

        }

    }
    object "c12_92_deployed" {
        code {
            mstore(64, 128)

            if iszero(lt(calldatasize(), 4))
            {
                let selector := shift_right_224_unsigned(calldataload(0))
                switch selector

                case 0x3a3fa77d
                {
                    // test_call(address,uint256)

                    let param_0, param_1 :=  abi_decode_tuple_t_addresst_uint256(4, calldatasize())
                    let ret_0 :=  fun_test_call_91(param_0, param_1)
                    let memPos := allocateMemory(0)
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x956776ea
                {
                    // test_staticcall_address(address,address)
                    if callvalue() { revert(0, 0) }
                    let param_0, param_1 :=  abi_decode_tuple_t_addresst_address(4, calldatasize())
                    let ret_0 :=  fun_test_staticcall_address_60(param_0, param_1)
                    let memPos := allocateMemory(0)
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x9d8201b7
                {
                    // test_staticcall(address,uint256,uint256)
                    if callvalue() { revert(0, 0) }
                    let param_0, param_1, param_2 :=  abi_decode_tuple_t_addresst_uint256t_uint256(4, calldatasize())
                    let ret_0 :=  fun_test_staticcall_32(param_0, param_1, param_2)
                    let memPos := allocateMemory(0)
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                default {}
            }
            if iszero(calldatasize()) {  }
            revert(0, 0)

            function abi_decode_t_address(offset, end) -> value {
                value := calldataload(offset)
                validator_revert_t_address(value)
            }

            function abi_decode_t_uint256(offset, end) -> value {
                value := calldataload(offset)
                validator_revert_t_uint256(value)
            }

            function abi_decode_tuple_t_addresst_address(headStart, dataEnd) -> value0, value1 {
                if slt(sub(dataEnd, headStart), 64) { revert(0, 0) }

                {

                    let offset := 0

                    value0 := abi_decode_t_address(add(headStart, offset), dataEnd)
                }

                {

                    let offset := 32

                    value1 := abi_decode_t_address(add(headStart, offset), dataEnd)
                }

            }

            function abi_decode_tuple_t_addresst_uint256(headStart, dataEnd) -> value0, value1 {
                if slt(sub(dataEnd, headStart), 64) { revert(0, 0) }

                {

                    let offset := 0

                    value0 := abi_decode_t_address(add(headStart, offset), dataEnd)
                }

                {

                    let offset := 32

                    value1 := abi_decode_t_uint256(add(headStart, offset), dataEnd)
                }

            }

            function abi_decode_tuple_t_addresst_uint256t_uint256(headStart, dataEnd) -> value0, value1, value2 {
                if slt(sub(dataEnd, headStart), 96) { revert(0, 0) }

                {

                    let offset := 0

                    value0 := abi_decode_t_address(add(headStart, offset), dataEnd)
                }

                {

                    let offset := 32

                    value1 := abi_decode_t_uint256(add(headStart, offset), dataEnd)
                }

                {

                    let offset := 64

                    value2 := abi_decode_t_uint256(add(headStart, offset), dataEnd)
                }

            }

            function abi_encode_t_address_to_t_address_fromStack(value, pos) {
                mstore(pos, cleanup_t_address(value))
            }

            function abi_encode_t_uint256_to_t_uint256_fromStack(value, pos) {
                mstore(pos, cleanup_t_uint256(value))
            }

            function abi_encode_tuple_t_address__to_t_address__fromStack(headStart , value0) -> tail {
                tail := add(headStart, 32)

                abi_encode_t_address_to_t_address_fromStack(value0,  add(headStart, 0))

            }

            function abi_encode_tuple_t_uint256__to_t_uint256__fromStack(headStart , value0) -> tail {
                tail := add(headStart, 32)

                abi_encode_t_uint256_to_t_uint256_fromStack(value0,  add(headStart, 0))

            }

            function abi_encode_tuple_t_uint256_t_uint256__to_t_uint256_t_uint256__fromStack(headStart , value0, value1) -> tail {
                tail := add(headStart, 64)

                abi_encode_t_uint256_to_t_uint256_fromStack(value0,  add(headStart, 0))

                abi_encode_t_uint256_to_t_uint256_fromStack(value1,  add(headStart, 32))

            }

            function allocateMemory(size) -> memPtr {
                memPtr := mload(64)
                let newFreePtr := add(memPtr, size)
                // protect against overflow
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }

            function allocateTemporaryMemory() -> memPtr {
                memPtr := mload(64)
            }

            function cleanup_t_address(value) -> cleaned {
                cleaned := cleanup_t_uint160(value)
            }

            function cleanup_t_uint160(value) -> cleaned {
                cleaned := and(value, 0xffffffffffffffffffffffffffffffffffffffff)
            }

            function cleanup_t_uint256(value) -> cleaned {
                cleaned := value
            }

            function extract_returndata() -> data {

                switch returndatasize()
                case 0 {
                    data := zero_value_for_split_t_bytes_memory_ptr()
                }
                default {
                    // allocate some memory into data of size returndatasize() + PADDING
                    data := allocateMemory(round_up_to_mul_of_32(add(returndatasize(), 0x20)))

                    // store array length into the front
                    mstore(data, returndatasize())

                    // append to data
                    returndatacopy(add(data, 0x20), 0, returndatasize())
                }

            }

            function fun_test_call_91(vloc_externalc_62, vloc_a_64) -> vloc_result_67 {
                let zero_value_for_type_t_uint256_18 := zero_value_for_split_t_uint256()
                vloc_result_67 := zero_value_for_type_t_uint256_18

                let _19 := vloc_externalc_62
                let expr_73 := _19
                let expr_74_address := expr_73
                let expr_76 := callvalue()
                let expr_77_address := expr_74_address
                let expr_77_value := expr_76
                let _20 := vloc_a_64
                let expr_81 := _20

                let expr_82_mpos := allocateTemporaryMemory()
                let _21 := add(expr_82_mpos, 0x20)

                mstore(_21, 0x66d29e6e00000000000000000000000000000000000000000000000000000000)
                _21 := add(_21, 4)

                let _22 := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(_21, expr_81)
                mstore(expr_82_mpos, sub(_22, add(expr_82_mpos, 0x20)))
                mstore(64, round_up_to_mul_of_32(_22))

                let _23 := add(expr_82_mpos, 0x20)
                let _24 := mload(expr_82_mpos)

                let expr_83_component_1 := call(gas(), expr_77_address,  expr_77_value,  _23, _24, 0, 0)

                let expr_83_component_2_mpos := extract_returndata()

                let vloc_success_70 := expr_83_component_1
                let vloc_data_72_mpos := expr_83_component_2_mpos
                let _25 := vloc_success_70
                let expr_86 := _25
                require_helper(expr_86)
                {
                    vloc_result_67 := mload(add(vloc_data_72_mpos, 32))
                }

            }

            function fun_test_staticcall_32(vloc_externalc_3, vloc_a_5, vloc_b_7) -> vloc_result_10 {
                let zero_value_for_type_t_uint256_1 := zero_value_for_split_t_uint256()
                vloc_result_10 := zero_value_for_type_t_uint256_1

                let _2 := vloc_externalc_3
                let expr_16 := _2
                let expr_17_address := expr_16
                let _3 := vloc_a_5
                let expr_21 := _3
                let _4 := vloc_b_7
                let expr_22 := _4

                let expr_23_mpos := allocateTemporaryMemory()
                let _5 := add(expr_23_mpos, 0x20)

                mstore(_5, 0xcad0899b00000000000000000000000000000000000000000000000000000000)
                _5 := add(_5, 4)

                let _6 := abi_encode_tuple_t_uint256_t_uint256__to_t_uint256_t_uint256__fromStack(_5, expr_21, expr_22)
                mstore(expr_23_mpos, sub(_6, add(expr_23_mpos, 0x20)))
                mstore(64, round_up_to_mul_of_32(_6))

                let _7 := add(expr_23_mpos, 0x20)
                let _8 := mload(expr_23_mpos)

                let expr_24_component_1 := staticcall(gas(), expr_17_address,  _7, _8, 0, 0)

                let expr_24_component_2_mpos := extract_returndata()

                let vloc_success_13 := expr_24_component_1
                let vloc_data_15_mpos := expr_24_component_2_mpos
                let _9 := vloc_success_13
                let expr_27 := _9
                require_helper(expr_27)
                {
                    vloc_result_10 := mload(add(vloc_data_15_mpos, 32))
                }

            }

            function fun_test_staticcall_address_60(vloc_externalc_34, vloc_addr_36) -> vloc_result_39 {
                let zero_value_for_type_t_uint256_10 := zero_value_for_split_t_uint256()
                vloc_result_39 := zero_value_for_type_t_uint256_10

                let _11 := vloc_externalc_34
                let expr_45 := _11
                let expr_46_address := expr_45
                let _12 := vloc_addr_36
                let expr_50 := _12

                let expr_51_mpos := allocateTemporaryMemory()
                let _13 := add(expr_51_mpos, 0x20)

                mstore(_13, 0x42f4579000000000000000000000000000000000000000000000000000000000)
                _13 := add(_13, 4)

                let _14 := abi_encode_tuple_t_address__to_t_address__fromStack(_13, expr_50)
                mstore(expr_51_mpos, sub(_14, add(expr_51_mpos, 0x20)))
                mstore(64, round_up_to_mul_of_32(_14))

                let _15 := add(expr_51_mpos, 0x20)
                let _16 := mload(expr_51_mpos)

                let expr_52_component_1 := staticcall(gas(), expr_46_address,  _15, _16, 0, 0)

                let expr_52_component_2_mpos := extract_returndata()

                let vloc_success_42 := expr_52_component_1
                let vloc_data_44_mpos := expr_52_component_2_mpos
                let _17 := vloc_success_42
                let expr_55 := _17
                require_helper(expr_55)
                {
                    vloc_result_39 := mload(add(vloc_data_44_mpos, 32))
                }

            }

            function panic_error_0x41() {
                mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)
                mstore(4, 0x41)
                revert(0, 0x24)
            }

            function require_helper(condition) {
                if iszero(condition) { revert(0, 0) }
            }

            function round_up_to_mul_of_32(value) -> result {
                result := and(add(value, 31), not(31))
            }

            function shift_right_224_unsigned(value) -> newValue {
                newValue :=

                shr(224, value)

            }

            function validator_revert_t_address(value) {
                if iszero(eq(value, cleanup_t_address(value))) { revert(0, 0) }
            }

            function validator_revert_t_uint256(value) {
                if iszero(eq(value, cleanup_t_uint256(value))) { revert(0, 0) }
            }

            function zero_value_for_split_t_bytes_memory_ptr() -> ret {
                ret := 96
            }

            function zero_value_for_split_t_uint256() -> ret {
                ret := 0
            }

        }

    }

}

