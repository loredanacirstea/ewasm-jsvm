/*******************************************************
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *******************************************************/


object "c10_75" {
    code {
        mstore(64, 128)
        if callvalue() { revert(0, 0) }

        let _1 := copy_arguments_for_constructor_16_object_c10_75()
        constructor_c10_75(_1)

        codecopy(0, dataoffset("c10_75_deployed"), datasize("c10_75_deployed"))

        return(0, datasize("c10_75_deployed"))

        function abi_decode_t_uint256_fromMemory(offset, end) -> value {
            value := mload(offset)
            validator_revert_t_uint256(value)
        }

        function abi_decode_tuple_t_uint256_fromMemory(headStart, dataEnd) -> value0 {
            if slt(sub(dataEnd, headStart), 32) { revert(0, 0) }

            {

                let offset := 0

                value0 := abi_decode_t_uint256_fromMemory(add(headStart, offset), dataEnd)
            }

        }

        function allocateMemory(size) -> memPtr {
            memPtr := mload(64)
            let newFreePtr := add(memPtr, size)
            // protect against overflow
            if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
            mstore(64, newFreePtr)
        }

        function cleanup_t_uint256(value) -> cleaned {
            cleaned := value
        }

        function constructor_c10_75(vloc__valueb_8) {

            let expr_3 := 0x05
            let _2 := convert_t_rational_5_by_1_to_t_uint256(expr_3)
            update_storage_value_offset_0t_uint256_to_t_uint256(0x00, _2)

            let _3 := vloc__valueb_8
            let expr_12 := _3
            update_storage_value_offset_0t_uint256_to_t_uint256(0x01, expr_12)
            let expr_13 := expr_12

        }

        function convert_t_rational_5_by_1_to_t_uint256(value) -> converted {
            converted := cleanup_t_uint256(value)
        }

        function convert_t_uint256_to_t_uint256(value) -> converted {
            converted := cleanup_t_uint256(value)
        }

        function copy_arguments_for_constructor_16_object_c10_75() -> ret_param_0 {
            let programSize := datasize("c10_75")
            let argSize := sub(codesize(), programSize)

            let memoryDataOffset := allocateMemory(argSize)
            codecopy(memoryDataOffset, programSize, argSize)

            ret_param_0 := abi_decode_tuple_t_uint256_fromMemory(memoryDataOffset, add(memoryDataOffset, argSize))
        }

        function panic_error_0x41() {
            mstore(0, 35408467139433450592217433187231851964531694900788300625387963629091585785856)
            mstore(4, 0x41)
            revert(0, 0x24)
        }

        function prepare_store_t_uint256(value) -> ret {
            ret := value
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

        function update_storage_value_offset_0t_uint256_to_t_uint256(slot, value_0) {
            let convertedValue_0 := convert_t_uint256_to_t_uint256(value_0)
            sstore(slot, update_byte_slice_32_shift_0(sload(slot), prepare_store_t_uint256(convertedValue_0)))
        }

        function validator_revert_t_uint256(value) {
            if iszero(eq(value, cleanup_t_uint256(value))) { revert(0, 0) }
        }

    }
    object "c10_75_deployed" {
        code {
            mstore(64, 128)

            if iszero(lt(calldatasize(), 4))
            {
                let selector := shift_right_224_unsigned(calldataload(0))
                switch selector

                case 0x3fa4f245
                {
                    // value()
                    if callvalue() { revert(0, 0) }
                    abi_decode_tuple_(4, calldatasize())
                    let ret_0 :=  getter_fun_value_4()
                    let memPos := allocateMemory(0)
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x42d7c99e
                {
                    // _revert()

                    abi_decode_tuple_(4, calldatasize())
                    let ret_0 :=  fun__revert_74()
                    let memPos := allocateMemory(0)
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x42f45790
                {
                    // testAddress(address)
                    if callvalue() { revert(0, 0) }
                    let param_0 :=  abi_decode_tuple_t_address(4, calldatasize())
                    let ret_0 :=  fun_testAddress_26(param_0)
                    let memPos := allocateMemory(0)
                    let memEnd := abi_encode_tuple_t_address__to_t_address__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x66d29e6e
                {
                    // addvalue(uint256)

                    let param_0 :=  abi_decode_tuple_t_uint256(4, calldatasize())
                    let ret_0 :=  fun_addvalue_59(param_0)
                    let memPos := allocateMemory(0)
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x783842c9
                {
                    // valueb()
                    if callvalue() { revert(0, 0) }
                    abi_decode_tuple_(4, calldatasize())
                    let ret_0 :=  getter_fun_valueb_6()
                    let memPos := allocateMemory(0)
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0xcad0899b
                {
                    // sum(uint256,uint256)
                    if callvalue() { revert(0, 0) }
                    let param_0, param_1 :=  abi_decode_tuple_t_uint256t_uint256(4, calldatasize())
                    let ret_0 :=  fun_sum_40(param_0, param_1)
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

            function abi_decode_tuple_(headStart, dataEnd)   {
                if slt(sub(dataEnd, headStart), 0) { revert(0, 0) }

            }

            function abi_decode_tuple_t_address(headStart, dataEnd) -> value0 {
                if slt(sub(dataEnd, headStart), 32) { revert(0, 0) }

                {

                    let offset := 0

                    value0 := abi_decode_t_address(add(headStart, offset), dataEnd)
                }

            }

            function abi_decode_tuple_t_uint256(headStart, dataEnd) -> value0 {
                if slt(sub(dataEnd, headStart), 32) { revert(0, 0) }

                {

                    let offset := 0

                    value0 := abi_decode_t_uint256(add(headStart, offset), dataEnd)
                }

            }

            function abi_decode_tuple_t_uint256t_uint256(headStart, dataEnd) -> value0, value1 {
                if slt(sub(dataEnd, headStart), 64) { revert(0, 0) }

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

            function allocateMemory(size) -> memPtr {
                memPtr := mload(64)
                let newFreePtr := add(memPtr, size)
                // protect against overflow
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { panic_error_0x41() }
                mstore(64, newFreePtr)
            }

            function checked_add_t_uint256(x, y) -> sum {
                x := cleanup_t_uint256(x)
                y := cleanup_t_uint256(y)

                // overflow, if x > (maxValue - y)
                if gt(x, sub(0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff, y)) { panic_error_0x11() }

                sum := add(x, y)
            }

            function cleanup_from_storage_t_uint256(value) -> cleaned {
                cleaned := value
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

            function convert_t_rational_10_by_1_to_t_uint256(value) -> converted {
                converted := cleanup_t_uint256(value)
            }

            function convert_t_uint256_to_t_uint256(value) -> converted {
                converted := cleanup_t_uint256(value)
            }

            function extract_from_storage_value_dynamict_uint256(slot_value, offset) -> value {
                value := cleanup_from_storage_t_uint256(shift_right_unsigned_dynamic(mul(offset, 8), slot_value))
            }

            function extract_from_storage_value_offset_0t_uint256(slot_value) -> value {
                value := cleanup_from_storage_t_uint256(shift_right_0_unsigned(slot_value))
            }

            function fun__revert_74() -> vloc__62 {
                let zero_value_for_type_t_uint256_10 := zero_value_for_split_t_uint256()
                vloc__62 := zero_value_for_type_t_uint256_10

                let _11 := read_from_storage_split_offset_0_t_uint256(0x00)
                let expr_65 := _11
                let expr_66 := 0x0a
                let expr_67 := checked_add_t_uint256(expr_65, convert_t_rational_10_by_1_to_t_uint256(expr_66))

                update_storage_value_offset_0t_uint256_to_t_uint256(0x00, expr_67)
                let expr_68 := expr_67
                revert(0, 0)

            }

            function fun_addvalue_59(vloc__value_42) -> vloc__45 {
                let zero_value_for_type_t_uint256_6 := zero_value_for_split_t_uint256()
                vloc__45 := zero_value_for_type_t_uint256_6

                let _7 := read_from_storage_split_offset_0_t_uint256(0x00)
                let expr_48 := _7
                let _8 := vloc__value_42
                let expr_49 := _8
                let expr_50 := checked_add_t_uint256(expr_48, expr_49)

                let expr_52 := callvalue()
                let expr_53 := checked_add_t_uint256(expr_50, expr_52)

                update_storage_value_offset_0t_uint256_to_t_uint256(0x00, expr_53)
                let expr_54 := expr_53
                let _9 := read_from_storage_split_offset_0_t_uint256(0x00)
                let expr_56 := _9
                vloc__45 := expr_56
                leave

            }

            function fun_sum_40(vloc_a_28, vloc_b_30) -> vloc_c_33 {
                let zero_value_for_type_t_uint256_3 := zero_value_for_split_t_uint256()
                vloc_c_33 := zero_value_for_type_t_uint256_3

                let _4 := vloc_a_28
                let expr_35 := _4
                let _5 := vloc_b_30
                let expr_36 := _5
                let expr_37 := checked_add_t_uint256(expr_35, expr_36)

                vloc_c_33 := expr_37
                leave

            }

            function fun_testAddress_26(vloc_addr_18) -> vloc_c_21 {
                let zero_value_for_type_t_address_1 := zero_value_for_split_t_address()
                vloc_c_21 := zero_value_for_type_t_address_1

                let _2 := vloc_addr_18
                let expr_23 := _2
                vloc_c_21 := expr_23
                leave

            }

            function getter_fun_value_4() -> ret {

                let slot := 0
                let offset := 0

                ret := read_from_storage_split_dynamic_t_uint256(slot, offset)

            }

            function getter_fun_valueb_6() -> ret {

                let slot := 1
                let offset := 0

                ret := read_from_storage_split_dynamic_t_uint256(slot, offset)

            }

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

            function prepare_store_t_uint256(value) -> ret {
                ret := value
            }

            function read_from_storage_split_dynamic_t_uint256(slot, offset) -> value {
                value := extract_from_storage_value_dynamict_uint256(sload(slot), offset)

            }

            function read_from_storage_split_offset_0_t_uint256(slot) -> value {
                value := extract_from_storage_value_offset_0t_uint256(sload(slot))

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

            function update_storage_value_offset_0t_uint256_to_t_uint256(slot, value_0) {
                let convertedValue_0 := convert_t_uint256_to_t_uint256(value_0)
                sstore(slot, update_byte_slice_32_shift_0(sload(slot), prepare_store_t_uint256(convertedValue_0)))
            }

            function validator_revert_t_address(value) {
                if iszero(eq(value, cleanup_t_address(value))) { revert(0, 0) }
            }

            function validator_revert_t_uint256(value) {
                if iszero(eq(value, cleanup_t_uint256(value))) { revert(0, 0) }
            }

            function zero_value_for_split_t_address() -> ret {
                ret := 0
            }

            function zero_value_for_split_t_uint256() -> ret {
                ret := 0
            }

        }

    }

}

