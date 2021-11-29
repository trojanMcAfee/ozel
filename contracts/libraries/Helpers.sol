//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import 'hardhat/console.sol';

import '../AppStorage.sol';


library Helpers {


    function _calculateSlippage(
        uint _amount, 
        uint _basisPoint
    ) public pure returns(uint minAmountOut) {
        minAmountOut = _amount - ( (_amount * _basisPoint) / 10000 );  
    }

    function _bytesToAddress(bytes memory _bytes) public pure returns (address addr) {
        assembly {
            addr := mload(add(_bytes,20))
        } 
    }



    function delegateTo(
        address _callee, 
        string memory _signature,
        address _actionReceiver,
        uint _amount,
        string memory _contract,
        string memory _method
    ) external {
        (bool success, ) = _callee.delegatecall(
            abi.encodeWithSignature(_signature, _actionReceiver, _amount)
        );
        require(success, string(abi.encodePacked(_contract, ': ', _method, ' failed')));
    }
    

}

