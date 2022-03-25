//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import 'hardhat/console.sol';

import '../AppStorage.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';


library Helpers {

    // AppStorage s;

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

    // function _tradeExec(int128 _tokenIn, int128 _tokenOut, IERC20 _contractIn) private {
    //     uint minOut;
    //     uint slippage;
    //     uint inBalance = _contractIn.balanceOf(address(this));

    //     if (_tokenIn == 0) {
    //         minOut = s.renPool.get_dy(_tokenIn, _tokenOut, inBalance);
    //         slippage = minOut._calculateSlippage(s.slippageTradingCurve);
    //         s.renPool.exchange(_tokenIn, _tokenOut, inBalance, slippage);
    //     } else if (_tokenIn == 1) {
    //         minOut = s.crv2Pool.get_dy(_tokenIn, _tokenOut, inBalance);
    //         slippage = minOut._calculateSlippage(s.slippageTradingCurve);
    //         s.USDT.approve(address(s.crv2Pool), inBalance);
    //         s.crv2Pool.exchange(_tokenIn, _tokenOut, inBalance, slippage);
    //     } else if (_tokenIn == 2) {
    //         minOut = s.mimPool.get_dy_underlying(_tokenIn, _tokenOut, inBalance);
    //         slippage = minOut._calculateSlippage(s.slippageTradingCurve);
    //         s.USDT.approve(address(s.mimPool), inBalance);
    //         s.mimPool.exchange_underlying(_tokenIn, _tokenOut, inBalance, slippage);
    //     }
    // }



    // function delegateTo(
    //     address _callee, 
    //     string memory _signature,
    //     address _actionReceiver,
    //     uint _amount,
    //     string memory _contract,
    //     string memory _method
    // ) external {
    //     (bool success, ) = _callee.delegatecall(
    //         abi.encodeWithSignature(_signature, _actionReceiver, _amount)
    //     );
    //     require(success, string(abi.encodePacked(_contract, ': ', _method, ' failed')));
    // }
    

}

