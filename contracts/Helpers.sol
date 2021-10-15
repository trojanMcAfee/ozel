//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


library Helpers {

    function _calculateSlippage(
        uint _amount, 
        uint _basisPoint
    ) public pure returns(uint minAmountOut) {
        minAmountOut = _amount - ( (_amount * _basisPoint) / 10000 ); //5 -> 0.05%; 
    }

}