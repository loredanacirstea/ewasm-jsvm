pragma solidity ^0.7.0;

contract c10 {
    uint256 public value = 5;

    function testAddress(address addr) pure public returns (address c) {
        return addr;
    }

    function sum(uint256 a, uint256 b) pure public returns (uint256 c) {
        return a + b;
    }

    function addvalue(uint256 _value) public payable returns (uint256) {
        value = value + _value + msg.value;
        return value;
    }

    function _revert() public payable returns (uint256) {
        value = value + 10;
        revert();
    }
}
