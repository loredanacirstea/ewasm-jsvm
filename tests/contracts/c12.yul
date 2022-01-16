/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/


/// @use-src 0:"./tests/sol/c12.sol", 1:"#utility.yul"
object "c12_92" {
    code {
        /// @src 0:25:1158
        mstore(64, 128)
        if callvalue() { revert_error_ca66f745a3ce8ff40e2ccaf1ad45db7774001b90d25810abd9040049be7bf4bb() }

        constructor_c12_92()

        let _1 := allocate_unbounded()
        codecopy(_1, dataoffset("c12_92_deployed"), datasize("c12_92_deployed"))

        return(_1, datasize("c12_92_deployed"))

        function allocate_unbounded() -> memPtr {
            memPtr := mload(64)
        }

        /// @src 0:25:1158
        function constructor_c12_92() {

            /// @src 0:25:1158

        }
        /// @src 0:25:1158

        function revert_error_ca66f745a3ce8ff40e2ccaf1ad45db7774001b90d25810abd9040049be7bf4bb() {
            revert(0, 0)
        }

    }
    object "c12_92_deployed" {
        code {
            /// @src 0:25:1158
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
                    let memPos := allocate_unbounded()
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x956776ea
                {
                    // test_staticcall_address(address,address)

                    if callvalue() { revert_error_ca66f745a3ce8ff40e2ccaf1ad45db7774001b90d25810abd9040049be7bf4bb() }
                    let param_0, param_1 :=  abi_decode_tuple_t_addresst_address(4, calldatasize())
                    let ret_0 :=  fun_test_staticcall_address_60(param_0, param_1)
                    let memPos := allocate_unbounded()
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x9d8201b7
                {
                    // test_staticcall(address,uint256,uint256)

                    if callvalue() { revert_error_ca66f745a3ce8ff40e2ccaf1ad45db7774001b90d25810abd9040049be7bf4bb() }
                    let param_0, param_1, param_2 :=  abi_decode_tuple_t_addresst_uint256t_uint256(4, calldatasize())
                    let ret_0 :=  fun_test_staticcall_32(param_0, param_1, param_2)
                    let memPos := allocate_unbounded()
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                default {}
            }
            if iszero(calldatasize()) {  }
            revert_error_42b3090547df1d2001c96683413b8cf91c1b902ef5e3cb8d9f6f304cf7446f74()

            function abi_decode_t_address(offset, end) -> value {
                value := calldataload(offset)
                validator_revert_t_address(value)
            }

            function abi_decode_t_uint256(offset, end) -> value {
                value := calldataload(offset)
                validator_revert_t_uint256(value)
            }

            function abi_decode_tuple_t_addresst_address(headStart, dataEnd) -> value0, value1 {
                if slt(sub(dataEnd, headStart), 64) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

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
                if slt(sub(dataEnd, headStart), 64) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

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
                if slt(sub(dataEnd, headStart), 96) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

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

            function allocate_memory(size) -> memPtr {
                memPtr := allocate_unbounded()
                finalize_allocation(memPtr, size)
            }

            function allocate_memory_array_t_bytes_memory_ptr(length) -> memPtr {
                let allocSize := array_allocation_size_t_bytes_memory_ptr(length)
                memPtr := allocate_memory(allocSize)

                mstore(memPtr, length)

            }

            function allocate_unbounded() -> memPtr {
                memPtr := mload(64)
            }

            function array_allocation_size_t_bytes_memory_ptr(length) -> size {
                // Make sure we can allocate memory without overflow
                if gt(length, 0xffffffffffffffff) { panic_error_0x41() }

                size := round_up_to_mul_of_32(length)

                // add length slot
                size := add(size, 0x20)

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
                    data := allocate_memory_array_t_bytes_memory_ptr(returndatasize())
                    returndatacopy(add(data, 0x20), 0, returndatasize())
                }

            }

            function finalize_allocation(memPtr, size) {
                let newFreePtr := add(memPtr, round_up_to_mul_of_32(size))
                // protect against overflow
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }

            /// @src 0:834:1155
            function fun_test_call_91(var_externalc_62, var_a_64) -> var_result_67 {
                /// @src 0:907:921
                let zero_t_uint256_18 := zero_value_for_split_t_uint256()
                var_result_67 := zero_t_uint256_18

                /// @src 0:969:978
                let _19 := var_externalc_62
                let expr_73 := _19
                /// @src 0:969:983
                let expr_74_address := expr_73
                /// @src 0:991:1000
                let expr_76 := callvalue()
                /// @src 0:969:1001
                let expr_77_address := expr_74_address
                let expr_77_value := expr_76
                /// @src 0:1047:1048
                let _20 := var_a_64
                let expr_81 := _20
                /// @src 0:1002:1049

                let expr_82_mpos := allocate_unbounded()
                let _21 := add(expr_82_mpos, 0x20)

                mstore(_21, 0x66d29e6e00000000000000000000000000000000000000000000000000000000)
                _21 := add(_21, 4)

                let _22 := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(_21, expr_81)
                mstore(expr_82_mpos, sub(_22, add(expr_82_mpos, 0x20)))
                finalize_allocation(expr_82_mpos, sub(_22, expr_82_mpos))
                /// @src 0:969:1050

                let _23 := add(expr_82_mpos, 0x20)
                let _24 := mload(expr_82_mpos)

                let expr_83_component_1 := call(gas(), expr_77_address,  expr_77_value,  _23, _24, 0, 0)
                let expr_83_component_2_mpos := extract_returndata()
                /// @src 0:933:1050
                let var_success_70 := expr_83_component_1
                let var_data_72_mpos := expr_83_component_2_mpos
                /// @src 0:1068:1075
                let _25 := var_success_70
                let expr_86 := _25
                /// @src 0:1060:1076
                require_helper(expr_86)
                /// @src 0:1086:1149
                {
                    var_result_67 := mload(add(var_data_72_mpos, 32))
                }

            }
            /// @src 0:25:1158

            /// @src 0:164:493
            function fun_test_staticcall_32(var_externalc_3, var_a_5, var_b_7) -> var_result_10 {
                /// @src 0:251:265
                let zero_t_uint256_1 := zero_value_for_split_t_uint256()
                var_result_10 := zero_t_uint256_1

                /// @src 0:313:322
                let _2 := var_externalc_3
                let expr_16 := _2
                /// @src 0:313:333
                let expr_17_address := expr_16
                /// @src 0:382:383
                let _3 := var_a_5
                let expr_21 := _3
                /// @src 0:385:386
                let _4 := var_b_7
                let expr_22 := _4
                /// @src 0:334:387

                let expr_23_mpos := allocate_unbounded()
                let _5 := add(expr_23_mpos, 0x20)

                mstore(_5, 0xcad0899b00000000000000000000000000000000000000000000000000000000)
                _5 := add(_5, 4)

                let _6 := abi_encode_tuple_t_uint256_t_uint256__to_t_uint256_t_uint256__fromStack(_5, expr_21, expr_22)
                mstore(expr_23_mpos, sub(_6, add(expr_23_mpos, 0x20)))
                finalize_allocation(expr_23_mpos, sub(_6, expr_23_mpos))
                /// @src 0:313:388

                let _7 := add(expr_23_mpos, 0x20)
                let _8 := mload(expr_23_mpos)

                let expr_24_component_1 := staticcall(gas(), expr_17_address,  _7, _8, 0, 0)
                let expr_24_component_2_mpos := extract_returndata()
                /// @src 0:277:388
                let var_success_13 := expr_24_component_1
                let var_data_15_mpos := expr_24_component_2_mpos
                /// @src 0:406:413
                let _9 := var_success_13
                let expr_27 := _9
                /// @src 0:398:414
                require_helper(expr_27)
                /// @src 0:424:487
                {
                    var_result_10 := mload(add(var_data_15_mpos, 32))
                }

            }
            /// @src 0:25:1158

            /// @src 0:499:828
            function fun_test_staticcall_address_60(var_externalc_34, var_addr_36) -> var_result_39 {
                /// @src 0:586:600
                let zero_t_uint256_10 := zero_value_for_split_t_uint256()
                var_result_39 := zero_t_uint256_10

                /// @src 0:648:657
                let _11 := var_externalc_34
                let expr_45 := _11
                /// @src 0:648:668
                let expr_46_address := expr_45
                /// @src 0:717:721
                let _12 := var_addr_36
                let expr_50 := _12
                /// @src 0:669:722

                let expr_51_mpos := allocate_unbounded()
                let _13 := add(expr_51_mpos, 0x20)

                mstore(_13, 0x42f4579000000000000000000000000000000000000000000000000000000000)
                _13 := add(_13, 4)

                let _14 := abi_encode_tuple_t_address__to_t_address__fromStack(_13, expr_50)
                mstore(expr_51_mpos, sub(_14, add(expr_51_mpos, 0x20)))
                finalize_allocation(expr_51_mpos, sub(_14, expr_51_mpos))
                /// @src 0:648:723

                let _15 := add(expr_51_mpos, 0x20)
                let _16 := mload(expr_51_mpos)

                let expr_52_component_1 := staticcall(gas(), expr_46_address,  _15, _16, 0, 0)
                let expr_52_component_2_mpos := extract_returndata()
                /// @src 0:612:723
                let var_success_42 := expr_52_component_1
                let var_data_44_mpos := expr_52_component_2_mpos
                /// @src 0:741:748
                let _17 := var_success_42
                let expr_55 := _17
                /// @src 0:733:749
                require_helper(expr_55)
                /// @src 0:759:822
                {
                    var_result_39 := mload(add(var_data_44_mpos, 32))
                }

            }
            /// @src 0:25:1158

            function panic_error_0x41() {
                mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)
                mstore(4, 0x41)
                revert(0, 0x24)
            }

            function require_helper(condition) {
                if iszero(condition) { revert(0, 0) }
            }

            function revert_error_42b3090547df1d2001c96683413b8cf91c1b902ef5e3cb8d9f6f304cf7446f74() {
                revert(0, 0)
            }

            function revert_error_c1322bf8034eace5e0b5c7295db60986aa89aae5e0ea0873e4689e076861a5db() {
                revert(0, 0)
            }

            function revert_error_ca66f745a3ce8ff40e2ccaf1ad45db7774001b90d25810abd9040049be7bf4bb() {
                revert(0, 0)
            }

            function revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() {
                revert(0, 0)
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

        data ".metadata" hex"a26469706673582212209ddaa67905ff500fbf7f64796ac5e40b5e2da9100987dae3ae099a7b1aa96b6f64736f6c63430008070033"
    }

}

