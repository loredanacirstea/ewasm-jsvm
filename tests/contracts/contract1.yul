/*******************************************************
 *                       WARNING                       *
 *  Solidity to Yul compilation is still EXPERIMENTAL  *
 *       It can result in LOSS OF FUNDS or worse       *
 *                !USE AT YOUR OWN RISK!               *
 *******************************************************/


object "contract1_36" {
    code {
        mstore(64, 128)
        if callvalue() { revert(0, 0) }

        constructor_contract1_36()

        codecopy(0, dataoffset("contract1_36_deployed"), datasize("contract1_36_deployed"))

        return(0, datasize("contract1_36_deployed"))

        function constructor_contract1_36() {

        }

    }
    object "contract1_36_deployed" {
        code {
            mstore(64, 128)

            if iszero(lt(calldatasize(), 4))
            {
                let selector := shift_right_224_unsigned(calldataload(0))
                switch selector

                case 0x6d5433e6
                {
                    // max(uint256,uint256)
                    if callvalue() { revert(0, 0) }
                    let param_0, param_1 :=  abi_decode_tuple_t_uint256t_uint256(4, calldatasize())
                    let ret_0 :=  fun_max_18(param_0, param_1)
                    let memPos := allocateMemory(0)
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                case 0x7ae2b5c7
                {
                    // min(uint256,uint256)
                    if callvalue() { revert(0, 0) }
                    let param_0, param_1 :=  abi_decode_tuple_t_uint256t_uint256(4, calldatasize())
                    let ret_0 :=  fun_min_35(param_0, param_1)
                    let memPos := allocateMemory(0)
                    let memEnd := abi_encode_tuple_t_uint256__to_t_uint256__fromStack(memPos , ret_0)
                    return(memPos, sub(memEnd, memPos))
                }

                default {}
            }
            if iszero(calldatasize()) {  }
            revert(0, 0)

            function abi_decode_t_uint256(offset, end) -> value {
                value := calldataload(offset)
                validator_revert_t_uint256(value)
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

            function abi_encode_t_uint256_to_t_uint256_fromStack(value, pos) {
                mstore(pos, cleanup_t_uint256(value))
            }

            function abi_encode_tuple_t_uint256__to_t_uint256__fromStack(headStart , value0) -> tail {
                tail := add(headStart, 32)

                abi_encode_t_uint256_to_t_uint256_fromStack(value0,  add(headStart, 0))

            }

            function allocateMemory(size) -> memPtr {
                memPtr := mload(64)
                let newFreePtr := add(memPtr, size)
                // protect against overflow
                if or(gt(newFreePtr, 0xffffffffffffffff), lt(newFreePtr, memPtr)) { revert(0, 0) }
                mstore(64, newFreePtr)
            }

            function cleanup_t_uint256(value) -> cleaned {
                cleaned := value
            }

            function fun_max_18(vloc_a_3, vloc_b_5) -> vloc__8 {
                let zero_value_for_type_t_uint256_1 := zero_value_for_split_t_uint256()
                vloc__8 := zero_value_for_type_t_uint256_1

                let _2 := vloc_a_3
                let expr_10 := _2
                let _3 := vloc_b_5
                let expr_11 := _3
                let expr_12 := iszero(lt(cleanup_t_uint256(expr_10), cleanup_t_uint256(expr_11)))
                let expr_15
                switch expr_12
                case 0 {
                    let _4 := vloc_b_5
                    let expr_14 := _4
                    expr_15 := expr_14
                }
                default {
                    let _5 := vloc_a_3
                    let expr_13 := _5
                    expr_15 := expr_13
                }
                vloc__8 := expr_15
                leave

            }

            function fun_min_35(vloc_a_20, vloc_b_22) -> vloc__25 {
                let zero_value_for_type_t_uint256_6 := zero_value_for_split_t_uint256()
                vloc__25 := zero_value_for_type_t_uint256_6

                let _7 := vloc_a_20
                let expr_27 := _7
                let _8 := vloc_b_22
                let expr_28 := _8
                let expr_29 := lt(cleanup_t_uint256(expr_27), cleanup_t_uint256(expr_28))
                let expr_32
                switch expr_29
                case 0 {
                    let _9 := vloc_b_22
                    let expr_31 := _9
                    expr_32 := expr_31
                }
                default {
                    let _10 := vloc_a_20
                    let expr_30 := _10
                    expr_32 := expr_30
                }
                vloc__25 := expr_32
                leave

            }

            function shift_right_224_unsigned(value) -> newValue {
                newValue :=

                shr(224, value)

            }

            function validator_revert_t_uint256(value) {
                if iszero(eq(value, cleanup_t_uint256(value))) { revert(0, 0) }
            }

            function zero_value_for_split_t_uint256() -> ret {
                ret := 0
            }

        }

    }

}

