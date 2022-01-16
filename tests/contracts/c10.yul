/*=====================================================*
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *=====================================================*/


/// @use-src 0:"./tests/sol/c10.sol", 1:"#utility.yul"
object "c10_155" {
    code {
        /// @src 0:25:1548
        mstore(64, 128)
        if callvalue() { revert_error_ca66f745a3ce8ff40e2ccaf1ad45db7774001b90d25810abd9040049be7bf4bb() }

        let _1 := copy_arguments_for_constructor_19_object_c10_155()
        constructor_c10_155(_1)

        let _2 := allocate_unbounded()
        codecopy(_2, dataoffset("c10_155_deployed"), datasize("c10_155_deployed"))

        return(_2, datasize("c10_155_deployed"))

        function abi_decode_t_uint256_fromMemory(offset, end) -> value {
            value := mload(offset)
            validator_revert_t_uint256(value)
        }

        function abi_decode_tuple_t_uint256_fromMemory(headStart, dataEnd) -> value0 {
            if slt(sub(dataEnd, headStart), 32) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

            {

                let offset := 0

                value0 := abi_decode_t_uint256_fromMemory(add(headStart, offset), dataEnd)
            }

        }

        function allocate_memory(size) -> memPtr {
            memPtr := allocate_unbounded()
            finalize_allocation(memPtr, size)
        }

        function allocate_unbounded() -> memPtr {
            memPtr := mload(64)
        }

        function cleanup_t_int256(value) -> cleaned {
            cleaned := value
        }

        function cleanup_t_uint256(value) -> cleaned {
            cleaned := value
        }

        /// @src 0:133:196
        function constructor_c10_155(var__valueb_11) {

            /// @src 0:133:196

            /// @src 0:67:68
            let expr_3 := 0x05
            update_storage_value_offset_0t_rational_5_by_1_to_t_uint256(0x00, expr_3)
            /// @src 0:123:126
            let expr_8 := 0x64
            update_storage_value_offset_0t_rational_100_by_1_to_t_int256(0x02, expr_8)

            /// @src 0:182:189
            let _3 := var__valueb_11
            let expr_15 := _3
            /// @src 0:173:189
            update_storage_value_offset_0t_uint256_to_t_uint256(0x01, expr_15)
            let expr_16 := expr_15

        }
        /// @src 0:25:1548

        function convert_t_rational_100_by_1_to_t_int256(value) -> converted {
            converted := cleanup_t_int256(value)
        }

        function convert_t_rational_5_by_1_to_t_uint256(value) -> converted {
            converted := cleanup_t_uint256(value)
        }

        function convert_t_uint256_to_t_uint256(value) -> converted {
            converted := cleanup_t_uint256(value)
        }

        function copy_arguments_for_constructor_19_object_c10_155() -> ret_param_0 {
            let programSize := datasize("c10_155")
            let argSize := sub(codesize(), programSize)

            let memoryDataOffset := allocate_memory(argSize)
            codecopy(memoryDataOffset, programSize, argSize)

            ret_param_0 := abi_decode_tuple_t_uint256_fromMemory(memoryDataOffset, add(memoryDataOffset, argSize))
        }

        function finalize_allocation(memPtr, size) {
            let newFreePtr := add(memPtr, round_up_to_mul_of_32(size))
            // protect against overflow
            if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
            mstore(64, newFreePtr)
        }

        function panic_error_0x41() {
            mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)
            mstore(4, 0x41)
            revert(0, 0x24)
        }

        function prepare_store_t_int256(value) -> ret {
            ret := value
        }

        function prepare_store_t_uint256(value) -> ret {
            ret := value
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

        function shift_left_0(value) -> newValue {
            newValue :=

            shl(0, value)

        }

        function update_byte_slice_32_shift_0(value, toInsert) -> result {
            let mask := 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
            toInsert := shift_left_0(toInsert)
            value := and(value, not(mask))
            result := or(value, and(toInsert, mask))
        }

        function update_storage_value_offset_0t_rational_100_by_1_to_t_int256(slot, value_0) {
            let convertedValue_0 := convert_t_rational_100_by_1_to_t_int256(value_0)
            sstore(slot, update_byte_slice_32_shift_0(sload(slot), prepare_store_t_int256(convertedValue_0)))
        }

        function update_storage_value_offset_0t_rational_5_by_1_to_t_uint256(slot, value_0) {
            let convertedValue_0 := convert_t_rational_5_by_1_to_t_uint256(value_0)
            sstore(slot, update_byte_slice_32_shift_0(sload(slot), prepare_store_t_uint256(convertedValue_0)))
        }

        function update_storage_value_offset_0t_uint256_to_t_uint256(slot, value_0) {
            let convertedValue_0 := convert_t_uint256_to_t_uint256(value_0)
            sstore(slot, update_byte_slice_32_shift_0(sload(slot), prepare_store_t_uint256(convertedValue_0)))
        }

        function validator_revert_t_uint256(value) {
            if iszero(eq(value, cleanup_t_uint256(value))) { revert(0, 0) }
        }

    }
    object "c10_155_deployed" {
        code {
            /// @src 0:25:1548
            mstore(64, 128)

            if iszero(lt(calldatasize(), 4))
            {
                let selector := shift_right_224_unsigned(calldataload(0))
                switch selector

                case 0x06b84303
                {
                    // anint()

                    if callvalue() { revert_error_ca66f745a3ce8ff40e2ccaf1ad45db7774001b90d25810abd9040049be7bf4bb() }
                    abi_decode_tuple_(4, calldatasize())
                    let ret_0 :=  getter_fun_anint_9()
                    let memPos := allocate_unbounded()
                    let memEnd := abi_encode_tuple_t_int256__to_t_int256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x19045a25
                {
                    // recover(bytes32,bytes)

                    if callvalue() { revert_error_ca66f745a3ce8ff40e2ccaf1ad45db7774001b90d25810abd9040049be7bf4bb() }
                    let param_0, param_1 :=  abi_decode_tuple_t_bytes32t_bytes_memory_ptr(4, calldatasize())
                    let ret_0 :=  fun_recover_154(param_0, param_1)
                    let memPos := allocate_unbounded()
                    let memEnd := abi_encode_tuple_t_address__to_t_address__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x3fa4f245
                {
                    // value()

                    if callvalue() { revert_error_ca66f745a3ce8ff40e2ccaf1ad45db7774001b90d25810abd9040049be7bf4bb() }
                    abi_decode_tuple_(4, calldatasize())
                    let ret_0 :=  getter_fun_value_4()
                    let memPos := allocate_unbounded()
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x42d7c99e
                {
                    // _revert()

                    abi_decode_tuple_(4, calldatasize())
                    let ret_0 :=  fun__revert_77()
                    let memPos := allocate_unbounded()
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x42f45790
                {
                    // testAddress(address)

                    if callvalue() { revert_error_ca66f745a3ce8ff40e2ccaf1ad45db7774001b90d25810abd9040049be7bf4bb() }
                    let param_0 :=  abi_decode_tuple_t_address(4, calldatasize())
                    let ret_0 :=  fun_testAddress_29(param_0)
                    let memPos := allocate_unbounded()
                    let memEnd := abi_encode_tuple_t_address__to_t_address__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x66d29e6e
                {
                    // addvalue(uint256)

                    let param_0 :=  abi_decode_tuple_t_uint256(4, calldatasize())
                    let ret_0 :=  fun_addvalue_62(param_0)
                    let memPos := allocate_unbounded()
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x783842c9
                {
                    // valueb()

                    if callvalue() { revert_error_ca66f745a3ce8ff40e2ccaf1ad45db7774001b90d25810abd9040049be7bf4bb() }
                    abi_decode_tuple_(4, calldatasize())
                    let ret_0 :=  getter_fun_valueb_6()
                    let memPos := allocate_unbounded()
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x9e64337f
                {
                    // testint(uint256)

                    if callvalue() { revert_error_ca66f745a3ce8ff40e2ccaf1ad45db7774001b90d25810abd9040049be7bf4bb() }
                    let param_0 :=  abi_decode_tuple_t_uint256(4, calldatasize())
                    fun_testint_90(param_0)
                    let memPos := allocate_unbounded()
                    let memEnd := abi_encode_tuple__to__fromStack(memPos  )
                    return(memPos, sub(memEnd, memPos))
                }

                case 0xcad0899b
                {
                    // sum(uint256,uint256)

                    if callvalue() { revert_error_ca66f745a3ce8ff40e2ccaf1ad45db7774001b90d25810abd9040049be7bf4bb() }
                    let param_0, param_1 :=  abi_decode_tuple_t_uint256t_uint256(4, calldatasize())
                    let ret_0 :=  fun_sum_43(param_0, param_1)
                    let memPos := allocate_unbounded()
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                default {}
            }
            if iszero(calldatasize()) {  }
            revert_error_42b3090547df1d2001c96683413b8cf91c1b902ef5e3cb8d9f6f304cf7446f74()

            function abi_decode_available_length_t_bytes_memory_ptr(src, length, end) -> array {
                array := allocate_memory(array_allocation_size_t_bytes_memory_ptr(length))
                mstore(array, length)
                let dst := add(array, 0x20)
                if gt(add(src, length), end) { revert_error_987264b3b1d58a9c7f8255e93e81c77d86d6299019c33110a076957a3e06e2ae() }
                copy_calldata_to_memory(src, dst, length)
            }

            function abi_decode_t_address(offset, end) -> value {
                value := calldataload(offset)
                validator_revert_t_address(value)
            }

            function abi_decode_t_bytes32(offset, end) -> value {
                value := calldataload(offset)
                validator_revert_t_bytes32(value)
            }

            // bytes
            function abi_decode_t_bytes_memory_ptr(offset, end) -> array {
                if iszero(slt(add(offset, 0x1f), end)) { revert_error_1b9f4a0a5773e33b91aa01db23bf8c55fce1411167c872835e7fa00a4f17d46d() }
                let length := calldataload(offset)
                array := abi_decode_available_length_t_bytes_memory_ptr(add(offset, 0x20), length, end)
            }

            function abi_decode_t_uint256(offset, end) -> value {
                value := calldataload(offset)
                validator_revert_t_uint256(value)
            }

            function abi_decode_tuple_(headStart, dataEnd)   {
                if slt(sub(dataEnd, headStart), 0) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

            }

            function abi_decode_tuple_t_address(headStart, dataEnd) -> value0 {
                if slt(sub(dataEnd, headStart), 32) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

                {

                    let offset := 0

                    value0 := abi_decode_t_address(add(headStart, offset), dataEnd)
                }

            }

            function abi_decode_tuple_t_bytes32t_bytes_memory_ptr(headStart, dataEnd) -> value0, value1 {
                if slt(sub(dataEnd, headStart), 64) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

                {

                    let offset := 0

                    value0 := abi_decode_t_bytes32(add(headStart, offset), dataEnd)
                }

                {

                    let offset := calldataload(add(headStart, 32))
                    if gt(offset, 0xffffffffffffffff) { revert_error_c1322bf8034eace5e0b5c7295db60986aa89aae5e0ea0873e4689e076861a5db() }

                    value1 := abi_decode_t_bytes_memory_ptr(add(headStart, offset), dataEnd)
                }

            }

            function abi_decode_tuple_t_uint256(headStart, dataEnd) -> value0 {
                if slt(sub(dataEnd, headStart), 32) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

                {

                    let offset := 0

                    value0 := abi_decode_t_uint256(add(headStart, offset), dataEnd)
                }

            }

            function abi_decode_tuple_t_uint256t_uint256(headStart, dataEnd) -> value0, value1 {
                if slt(sub(dataEnd, headStart), 64) { revert_error_dbdddcbe895c83990c08b3492a0e83918d802a52331272ac6fdb6a7c4aea3b1b() }

                {

                    let offset := 0

                    value0 := abi_decode_t_uint256(add(headStart, offset), dataEnd)
                }

                {

                    let offset := 32

                    value1 := abi_decode_t_uint256(add(headStart, offset), dataEnd)
                }

            }

            function abi_encode_t_address_to_t_address_fromStack(value, pos) {
                mstore(pos, cleanup_t_address(value))
            }

            function abi_encode_t_bytes32_to_t_bytes32_fromStack(value, pos) {
                mstore(pos, cleanup_t_bytes32(value))
            }

            function abi_encode_t_int256_to_t_int256_fromStack(value, pos) {
                mstore(pos, cleanup_t_int256(value))
            }

            function abi_encode_t_uint256_to_t_uint256_fromStack(value, pos) {
                mstore(pos, cleanup_t_uint256(value))
            }

            function abi_encode_t_uint8_to_t_uint8_fromStack(value, pos) {
                mstore(pos, cleanup_t_uint8(value))
            }

            function abi_encode_tuple__to__fromStack(headStart ) -> tail {
                tail := add(headStart, 0)

            }

            function abi_encode_tuple_t_address__to_t_address__fromStack(headStart , value0) -> tail {
                tail := add(headStart, 32)

                abi_encode_t_address_to_t_address_fromStack(value0,  add(headStart, 0))

            }

            function abi_encode_tuple_t_bytes32_t_uint8_t_bytes32_t_bytes32__to_t_bytes32_t_uint8_t_bytes32_t_bytes32__fromStack(headStart , value0, value1, value2, value3) -> tail {
                tail := add(headStart, 128)

                abi_encode_t_bytes32_to_t_bytes32_fromStack(value0,  add(headStart, 0))

                abi_encode_t_uint8_to_t_uint8_fromStack(value1,  add(headStart, 32))

                abi_encode_t_bytes32_to_t_bytes32_fromStack(value2,  add(headStart, 64))

                abi_encode_t_bytes32_to_t_bytes32_fromStack(value3,  add(headStart, 96))

            }

            function abi_encode_tuple_t_int256__to_t_int256__fromStack(headStart , value0) -> tail {
                tail := add(headStart, 32)

                abi_encode_t_int256_to_t_int256_fromStack(value0,  add(headStart, 0))

            }

            function abi_encode_tuple_t_uint256__to_t_uint256__fromStack(headStart , value0) -> tail {
                tail := add(headStart, 32)

                abi_encode_t_uint256_to_t_uint256_fromStack(value0,  add(headStart, 0))

            }

            function allocate_memory(size) -> memPtr {
                memPtr := allocate_unbounded()
                finalize_allocation(memPtr, size)
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

            function array_length_t_bytes_memory_ptr(value) -> length {

                length := mload(value)

            }

            function checked_add_t_uint256(x, y) -> sum {
                x := cleanup_t_uint256(x)
                y := cleanup_t_uint256(y)

                // overflow, if x > (maxValue - y)
                if gt(x, sub(0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff, y)) { panic_error_0x11() }

                sum := add(x, y)
            }

            function checked_add_t_uint8(x, y) -> sum {
                x := cleanup_t_uint8(x)
                y := cleanup_t_uint8(y)

                // overflow, if x > (maxValue - y)
                if gt(x, sub(0xff, y)) { panic_error_0x11() }

                sum := add(x, y)
            }

            function checked_sub_t_int256(x, y) -> diff {
                x := cleanup_t_int256(x)
                y := cleanup_t_int256(y)

                // underflow, if y >= 0 and x < (minValue + y)
                if and(iszero(slt(y, 0)), slt(x, add(0x8000000000000000000000000000000000000000000000000000000000000000, y))) { panic_error_0x11() }
                // overflow, if y < 0 and x > (maxValue + y)
                if and(slt(y, 0), sgt(x, add(0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff, y))) { panic_error_0x11() }

                diff := sub(x, y)
            }

            function cleanup_from_storage_t_int256(value) -> cleaned {
                cleaned := value
            }

            function cleanup_from_storage_t_uint256(value) -> cleaned {
                cleaned := value
            }

            function cleanup_t_address(value) -> cleaned {
                cleaned := cleanup_t_uint160(value)
            }

            function cleanup_t_bytes32(value) -> cleaned {
                cleaned := value
            }

            function cleanup_t_int256(value) -> cleaned {
                cleaned := value
            }

            function cleanup_t_uint160(value) -> cleaned {
                cleaned := and(value, 0xffffffffffffffffffffffffffffffffffffffff)
            }

            function cleanup_t_uint256(value) -> cleaned {
                cleaned := value
            }

            function cleanup_t_uint8(value) -> cleaned {
                cleaned := and(value, 0xff)
            }

            function convert_t_int256_to_t_int256(value) -> converted {
                converted := cleanup_t_int256(value)
            }

            function convert_t_rational_0_by_1_to_t_address(value) -> converted {
                converted := convert_t_rational_0_by_1_to_t_uint160(value)
            }

            function convert_t_rational_0_by_1_to_t_uint160(value) -> converted {
                converted := cleanup_t_uint160(value)
            }

            function convert_t_rational_10_by_1_to_t_uint256(value) -> converted {
                converted := cleanup_t_uint256(value)
            }

            function convert_t_rational_27_by_1_to_t_uint8(value) -> converted {
                converted := cleanup_t_uint8(value)
            }

            function convert_t_rational_28_by_1_to_t_uint8(value) -> converted {
                converted := cleanup_t_uint8(value)
            }

            function convert_t_rational_65_by_1_to_t_uint256(value) -> converted {
                converted := cleanup_t_uint256(value)
            }

            function convert_t_uint256_to_t_int256(value) -> converted {
                converted := cleanup_t_int256(value)
            }

            function convert_t_uint256_to_t_uint256(value) -> converted {
                converted := cleanup_t_uint256(value)
            }

            function copy_calldata_to_memory(src, dst, length) {
                calldatacopy(dst, src, length)
                // clear end
                mstore(add(dst, length), 0)
            }

            function extract_from_storage_value_dynamict_int256(slot_value, offset) -> value {
                value := cleanup_from_storage_t_int256(shift_right_unsigned_dynamic(mul(offset, 8), slot_value))
            }

            function extract_from_storage_value_dynamict_uint256(slot_value, offset) -> value {
                value := cleanup_from_storage_t_uint256(shift_right_unsigned_dynamic(mul(offset, 8), slot_value))
            }

            function extract_from_storage_value_offset_0t_int256(slot_value) -> value {
                value := cleanup_from_storage_t_int256(shift_right_0_unsigned(slot_value))
            }

            function extract_from_storage_value_offset_0t_uint256(slot_value) -> value {
                value := cleanup_from_storage_t_uint256(shift_right_0_unsigned(slot_value))
            }

            function finalize_allocation(memPtr, size) {
                let newFreePtr := add(memPtr, round_up_to_mul_of_32(size))
                // protect against overflow
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }

            /// @src 0:551:656
            function fun__revert_77() -> var__65 {
                /// @src 0:594:601
                let zero_t_uint256_10 := zero_value_for_split_t_uint256()
                var__65 := zero_t_uint256_10

                /// @src 0:621:626
                let _11 := read_from_storage_split_offset_0_t_uint256(0x00)
                let expr_68 := _11
                /// @src 0:629:631
                let expr_69 := 0x0a
                /// @src 0:621:631
                let expr_70 := checked_add_t_uint256(expr_68, convert_t_rational_10_by_1_to_t_uint256(expr_69))

                /// @src 0:613:631
                update_storage_value_offset_0t_uint256_to_t_uint256(0x00, expr_70)
                let expr_71 := expr_70
                /// @src 0:641:649
                revert(0, 0)

            }
            /// @src 0:25:1548

            /// @src 0:405:545
            function fun_addvalue_62(var__value_45) -> var__48 {
                /// @src 0:463:470
                let zero_t_uint256_6 := zero_value_for_split_t_uint256()
                var__48 := zero_t_uint256_6

                /// @src 0:490:495
                let _7 := read_from_storage_split_offset_0_t_uint256(0x00)
                let expr_51 := _7
                /// @src 0:498:504
                let _8 := var__value_45
                let expr_52 := _8
                /// @src 0:490:504
                let expr_53 := checked_add_t_uint256(expr_51, expr_52)

                /// @src 0:507:516
                let expr_55 := callvalue()
                /// @src 0:490:516
                let expr_56 := checked_add_t_uint256(expr_53, expr_55)

                /// @src 0:482:516
                update_storage_value_offset_0t_uint256_to_t_uint256(0x00, expr_56)
                let expr_57 := expr_56
                /// @src 0:533:538
                let _9 := read_from_storage_split_offset_0_t_uint256(0x00)
                let expr_59 := _9
                /// @src 0:526:538
                var__48 := expr_59
                leave

            }
            /// @src 0:25:1548

            /// @src 0:738:1546
            function fun_recover_154(var_hash_92, var_sig_94_mpos) -> var__97 {
                /// @src 0:808:815
                let zero_t_address_14 := zero_value_for_split_t_address()
                var__97 := zero_t_address_14

                /// @src 0:827:836
                let var_r_100
                let zero_t_bytes32_15 := zero_value_for_split_t_bytes32()
                var_r_100 := zero_t_bytes32_15
                /// @src 0:846:855
                let var_s_103
                let zero_t_bytes32_16 := zero_value_for_split_t_bytes32()
                var_s_103 := zero_t_bytes32_16
                /// @src 0:865:872
                let var_v_106
                let zero_t_uint8_17 := zero_value_for_split_t_uint8()
                var_v_106 := zero_t_uint8_17
                /// @src 0:924:927
                let _18_mpos := var_sig_94_mpos
                let expr_108_mpos := _18_mpos
                /// @src 0:924:934
                let expr_109 := array_length_t_bytes_memory_ptr(expr_108_mpos)
                /// @src 0:938:940
                let expr_110 := 0x41
                /// @src 0:924:940
                let expr_111 := iszero(eq(cleanup_t_uint256(expr_109), convert_t_rational_65_by_1_to_t_uint256(expr_110)))
                /// @src 0:920:986
                if expr_111 {
                    /// @src 0:972:973
                    let expr_114 := 0x00
                    /// @src 0:964:974
                    let expr_115 := convert_t_rational_0_by_1_to_t_address(expr_114)
                    /// @src 0:963:975
                    let expr_116 := expr_115
                    /// @src 0:956:975
                    var__97 := expr_116
                    leave
                    /// @src 0:920:986
                }
                /// @src 0:1052:1192
                {
                    var_r_100 := mload(add(var_sig_94_mpos, 32))
                    var_s_103 := mload(add(var_sig_94_mpos, 64))
                    var_v_106 := byte(0, mload(add(var_sig_94_mpos, 96)))
                }
                /// @src 0:1297:1298
                let _19 := var_v_106
                let expr_121 := _19
                /// @src 0:1301:1303
                let expr_122 := 0x1b
                /// @src 0:1297:1303
                let expr_123 := lt(cleanup_t_uint8(expr_121), convert_t_rational_27_by_1_to_t_uint8(expr_122))
                /// @src 0:1293:1337
                if expr_123 {
                    /// @src 0:1324:1326
                    let expr_125 := 0x1b
                    /// @src 0:1319:1326
                    let _20 := convert_t_rational_27_by_1_to_t_uint8(expr_125)
                    let _21 := var_v_106
                    let expr_126 := checked_add_t_uint8(_21, _20)

                    var_v_106 := expr_126
                    /// @src 0:1293:1337
                }
                /// @src 0:1414:1415
                let _22 := var_v_106
                let expr_130 := _22
                /// @src 0:1419:1421
                let expr_131 := 0x1b
                /// @src 0:1414:1421
                let expr_132 := iszero(eq(cleanup_t_uint8(expr_130), convert_t_rational_27_by_1_to_t_uint8(expr_131)))
                /// @src 0:1414:1432
                let expr_136 := expr_132
                if expr_136 {
                    /// @src 0:1425:1426
                    let _23 := var_v_106
                    let expr_133 := _23
                    /// @src 0:1430:1432
                    let expr_134 := 0x1c
                    /// @src 0:1425:1432
                    let expr_135 := iszero(eq(cleanup_t_uint8(expr_133), convert_t_rational_28_by_1_to_t_uint8(expr_134)))
                    /// @src 0:1414:1432
                    expr_136 := expr_135
                }
                /// @src 0:1410:1540
                switch expr_136
                case 0 {
                    /// @src 0:1515:1519
                    let _24 := var_hash_92
                    let expr_145 := _24
                    /// @src 0:1521:1522
                    let _25 := var_v_106
                    let expr_146 := _25
                    /// @src 0:1524:1525
                    let _26 := var_r_100
                    let expr_147 := _26
                    /// @src 0:1527:1528
                    let _27 := var_s_103
                    let expr_148 := _27
                    /// @src 0:1505:1529

                    let _28 := allocate_unbounded()
                    let _29 := abi_encode_tuple_t_bytes32_t_uint8_t_bytes32_t_bytes32__to_t_bytes32_t_uint8_t_bytes32_t_bytes32__fromStack(_28 , expr_145, expr_146, expr_147, expr_148)

                    mstore(0, 0)

                    let _30 := staticcall(gas(), 1 , _28, sub(_29, _28), 0, 32)
                    if iszero(_30) { revert_forward_1() }
                    let expr_149 := shift_left_0(mload(0))
                    /// @src 0:1498:1529
                    var__97 := expr_149
                    leave
                    /// @src 0:1410:1540
                }
                default {
                    /// @src 0:1464:1465
                    let expr_139 := 0x00
                    /// @src 0:1456:1466
                    let expr_140 := convert_t_rational_0_by_1_to_t_address(expr_139)
                    /// @src 0:1455:1467
                    let expr_141 := expr_140
                    /// @src 0:1448:1467
                    var__97 := expr_141
                    leave
                    /// @src 0:1410:1540
                }

            }
            /// @src 0:25:1548

            /// @src 0:303:399
            function fun_sum_43(var_a_31, var_b_33) -> var_c_36 {
                /// @src 0:359:368
                let zero_t_uint256_3 := zero_value_for_split_t_uint256()
                var_c_36 := zero_t_uint256_3

                /// @src 0:387:388
                let _4 := var_a_31
                let expr_38 := _4
                /// @src 0:391:392
                let _5 := var_b_33
                let expr_39 := _5
                /// @src 0:387:392
                let expr_40 := checked_add_t_uint256(expr_38, expr_39)

                /// @src 0:380:392
                var_c_36 := expr_40
                leave

            }
            /// @src 0:25:1548

            /// @src 0:202:297
            function fun_testAddress_29(var_addr_21) -> var_c_24 {
                /// @src 0:258:267
                let zero_t_address_1 := zero_value_for_split_t_address()
                var_c_24 := zero_t_address_1

                /// @src 0:286:290
                let _2 := var_addr_21
                let expr_26 := _2
                /// @src 0:279:290
                var_c_24 := expr_26
                leave

            }
            /// @src 0:25:1548

            /// @src 0:662:732
            function fun_testint_90(var_a_79) {

                /// @src 0:723:724
                let _12 := var_a_79
                let expr_85 := _12
                /// @src 0:716:725
                let expr_86 := convert_t_uint256_to_t_int256(expr_85)
                /// @src 0:707:725
                let _13 := read_from_storage_split_offset_0_t_int256(0x02)
                let expr_87 := checked_sub_t_int256(_13, expr_86)

                update_storage_value_offset_0t_int256_to_t_int256(0x02, expr_87)

            }
            /// @src 0:25:1548

            /// @src 0:101:126
            function getter_fun_anint_9() -> ret {

                let slot := 2
                let offset := 0

                ret := read_from_storage_split_dynamic_t_int256(slot, offset)

            }
            /// @src 0:25:1548

            /// @src 0:44:68
            function getter_fun_value_4() -> ret {

                let slot := 0
                let offset := 0

                ret := read_from_storage_split_dynamic_t_uint256(slot, offset)

            }
            /// @src 0:25:1548

            /// @src 0:74:95
            function getter_fun_valueb_6() -> ret {

                let slot := 1
                let offset := 0

                ret := read_from_storage_split_dynamic_t_uint256(slot, offset)

            }
            /// @src 0:25:1548

            function panic_error_0x11() {
                mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)
                mstore(4, 0x11)
                revert(0, 0x24)
            }

            function panic_error_0x41() {
                mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)
                mstore(4, 0x41)
                revert(0, 0x24)
            }

            function prepare_store_t_int256(value) -> ret {
                ret := value
            }

            function prepare_store_t_uint256(value) -> ret {
                ret := value
            }

            function read_from_storage_split_dynamic_t_int256(slot, offset) -> value {
                value := extract_from_storage_value_dynamict_int256(sload(slot), offset)

            }

            function read_from_storage_split_dynamic_t_uint256(slot, offset) -> value {
                value := extract_from_storage_value_dynamict_uint256(sload(slot), offset)

            }

            function read_from_storage_split_offset_0_t_int256(slot) -> value {
                value := extract_from_storage_value_offset_0t_int256(sload(slot))

            }

            function read_from_storage_split_offset_0_t_uint256(slot) -> value {
                value := extract_from_storage_value_offset_0t_uint256(sload(slot))

            }

            function revert_error_1b9f4a0a5773e33b91aa01db23bf8c55fce1411167c872835e7fa00a4f17d46d() {
                revert(0, 0)
            }

            function revert_error_42b3090547df1d2001c96683413b8cf91c1b902ef5e3cb8d9f6f304cf7446f74() {
                revert(0, 0)
            }

            function revert_error_987264b3b1d58a9c7f8255e93e81c77d86d6299019c33110a076957a3e06e2ae() {
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

            function revert_forward_1() {
                let pos := allocate_unbounded()
                returndatacopy(pos, 0, returndatasize())
                revert(pos, returndatasize())
            }

            function round_up_to_mul_of_32(value) -> result {
                result := and(add(value, 31), not(31))
            }

            function shift_left_0(value) -> newValue {
                newValue :=

                shl(0, value)

            }

            function shift_right_0_unsigned(value) -> newValue {
                newValue :=

                shr(0, value)

            }

            function shift_right_224_unsigned(value) -> newValue {
                newValue :=

                shr(224, value)

            }

            function shift_right_unsigned_dynamic(bits, value) -> newValue {
                newValue :=

                shr(bits, value)

            }

            function update_byte_slice_32_shift_0(value, toInsert) -> result {
                let mask := 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
                toInsert := shift_left_0(toInsert)
                value := and(value, not(mask))
                result := or(value, and(toInsert, mask))
            }

            function update_storage_value_offset_0t_int256_to_t_int256(slot, value_0) {
                let convertedValue_0 := convert_t_int256_to_t_int256(value_0)
                sstore(slot, update_byte_slice_32_shift_0(sload(slot), prepare_store_t_int256(convertedValue_0)))
            }

            function update_storage_value_offset_0t_uint256_to_t_uint256(slot, value_0) {
                let convertedValue_0 := convert_t_uint256_to_t_uint256(value_0)
                sstore(slot, update_byte_slice_32_shift_0(sload(slot), prepare_store_t_uint256(convertedValue_0)))
            }

            function validator_revert_t_address(value) {
                if iszero(eq(value, cleanup_t_address(value))) { revert(0, 0) }
            }

            function validator_revert_t_bytes32(value) {
                if iszero(eq(value, cleanup_t_bytes32(value))) { revert(0, 0) }
            }

            function validator_revert_t_uint256(value) {
                if iszero(eq(value, cleanup_t_uint256(value))) { revert(0, 0) }
            }

            function zero_value_for_split_t_address() -> ret {
                ret := 0
            }

            function zero_value_for_split_t_bytes32() -> ret {
                ret := 0
            }

            function zero_value_for_split_t_uint256() -> ret {
                ret := 0
            }

            function zero_value_for_split_t_uint8() -> ret {
                ret := 0
            }

        }

        data ".metadata" hex"a264697066735822122099aca240c5d271cac3609f4ba49d47faae0facc67a43b54d8b905d6ff1a58aa964736f6c63430008070033"
    }

}

