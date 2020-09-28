pragma solidity 0.7.0;

contract c10 {
    function sum(uint256 a, uint256 b) pure public returns (uint256 c) {
        return a + b;
    }

    function double(uint256 a) pure public returns (uint256 b) {
        return sum(a, a);
    }
}
