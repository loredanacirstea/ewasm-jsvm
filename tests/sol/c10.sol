pragma solidity ^0.8.0;

contract c10 {
    uint256 public value = 5;
    uint256 public valueb;
    int256 public anint = 100;

    constructor (uint256 _valueb) {
        valueb = _valueb;
    }

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

    function testint(uint256 a) public {
        anint -= int256(a);
    }

    function recover(bytes32 hash, bytes memory sig) public pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;

        //Check the signature length
        if (sig.length != 65) {
            return (address(0));
        }

        // Divide the signature in r, s and v variables
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
        if (v < 27) {
            v += 27;
        }

        // If the version is correct return the signer address
        if (v != 27 && v != 28) {
            return (address(0));
        } else {
            return ecrecover(hash, v, r, s);
        }
    }
}
