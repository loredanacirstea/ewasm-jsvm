pragma solidity ^0.7.0;

contract c12 {
    // address public externalc;

    // constructor(address _externalc) {
    //     externalc = _externalc;
    // }

    function test_staticcall(address externalc, uint256 a, uint256 b) view public returns (uint256 result) {
        (bool success, bytes memory data) = externalc.staticcall(abi.encodeWithSignature("sum(uint256,uint256)", a, b));
        require(success);
        assembly {
            result := mload(add(data, 32))
        }
    }

    function test_staticcall_address(address externalc, address addr) view public returns (uint256 result) {
        (bool success, bytes memory data) = externalc.staticcall(abi.encodeWithSignature("testAddress(address)", addr));
        require(success);
        assembly {
            result := mload(add(data, 32))
        }
    }

    function test_call(address externalc, uint256 a) payable public returns (uint256 result) {
        (bool success, bytes memory data) = externalc.call(abi.encodeWithSignature("addvalue(uint256)", a));
        require(success);
        assembly {
            result := mload(add(data, 32))
        }
    }

}
