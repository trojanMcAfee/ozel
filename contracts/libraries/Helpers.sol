//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


library Helpers {

    function _calculateSlippage(
        uint _amount, 
        uint _basisPoint
    ) public pure returns(uint minAmountOut) {
        minAmountOut = _amount - ( (_amount * _basisPoint) / 10000 ); //5 -> 0.05%; 
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