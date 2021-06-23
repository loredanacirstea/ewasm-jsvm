// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

contract Metering {
    fallback () external {
        assembly {
            mstore(0, 0xeeeeeeeeeeeeee)
            return (0, 32)
        }
    }
}
