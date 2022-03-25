//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './AppStorage.sol';


abstract contract HelpersAbs {

    AppStorage s;

    function calculateSlippage(
        uint _amount, 
        uint _basisPoint
    ) internal pure returns(uint minAmountOut) {
        minAmountOut = _amount - ( (_amount * _basisPoint) / 10000 );  
    }


    function executeFinalTrade(int128 _tokenIn, int128 _tokenOut, IERC20 _contractIn) internal {
        uint minOut;
        uint slippage;
        uint inBalance = _contractIn.balanceOf(address(this));

        if (_tokenIn == 0) {
            minOut = s.renPool.get_dy(_tokenIn, _tokenOut, inBalance);
            slippage = calculateSlippage(minOut, s.slippageTradingCurve);
            s.renPool.exchange(_tokenIn, _tokenOut, inBalance, slippage);
        } else if (_tokenIn == 1) {
            minOut = s.crv2Pool.get_dy(_tokenIn, _tokenOut, inBalance);
            slippage = calculateSlippage(minOut, s.slippageTradingCurve);
            s.USDT.approve(address(s.crv2Pool), inBalance);
            s.crv2Pool.exchange(_tokenIn, _tokenOut, inBalance, slippage);
        } else if (_tokenIn == 2) {
            minOut = s.mimPool.get_dy_underlying(_tokenIn, _tokenOut, inBalance);
            slippage = calculateSlippage(minOut, s.slippageTradingCurve);
            s.USDT.approve(address(s.mimPool), inBalance);
            s.mimPool.exchange_underlying(_tokenIn, _tokenOut, inBalance, slippage);
        }
    }


}