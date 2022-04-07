//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './pyERC20/pyERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../AppStorage.sol';
import '../libraries/FixedPointMathLib.sol';
import {IMulCurv} from '../interfaces/ICurve.sol';

import 'hardhat/console.sol';


contract ExecutorF { 

    AppStorage s;

    using FixedPointMathLib for uint;

    function calculateSlippage(
        uint amount_, 
        uint basisPoint_
    ) public pure returns(uint minAmountOut) {
        minAmountOut = amount_ - amount_.mulDivDown(basisPoint_, 10000);
    }



    function executeFinalTrade(TradeOps memory swapDetails_) public payable {
        uint minOut;
        uint slippage;
        uint inBalance = IERC20(swapDetails_.baseToken).balanceOf(address(this));

        if (swapDetails_.pool != s.renPool) {
            IERC20(s.USDT).approve(swapDetails_.pool, inBalance);
        }

        if (swapDetails_.pool == s.renPool || swapDetails_.pool == s.crv2Pool) {
            minOut = IMulCurv(swapDetails_.pool).get_dy(
                swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance
            );
            slippage = calculateSlippage(minOut, s.slippageTradingCurve);
            IMulCurv(swapDetails_.pool).exchange(
                swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance, slippage
            );
        } else {
            minOut = IMulCurv(swapDetails_.pool).get_dy_underlying(
                swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance
            );
            slippage = calculateSlippage(minOut, s.slippageTradingCurve);
            IMulCurv(swapDetails_.pool).exchange_underlying(
                swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance, slippage
            );
        }
    }
   

    //****** Modifies manager's STATE *****/

    function updateManagerState(
        uint amount_, 
        address user_
    ) external payable { //<------ double check the payable
        s.usersPayments[user_] += amount_;
        s.totalVolume += amount_;
        _updateIndex();
    }

    function _updateIndex() private { 
        uint eth = 1 ether;
        s.distributionIndex = 
            s.totalVolume != 0 ? eth.mulDivDown(10 ** 8, s.totalVolume) * 10 ** 14 : 0;
    }

    function modifyPaymentsAndVolumeExternally(address user_, uint newAmount_) external {
        s.usersPayments[user_] -= newAmount_;
        s.totalVolume -= newAmount_;
        _updateIndex();
    }

    function transferUserAllocation(
        address sender_, 
        address receiver_, 
        uint _amount, 
        uint senderBalance_
    ) public { 
        uint percentageToTransfer = (_amount * 10000) / senderBalance_;
        uint amountToTransfer = percentageToTransfer.mulDivDown(s.usersPayments[sender_] , 10000);

        s.usersPayments[sender_] -= amountToTransfer;
        s.usersPayments[receiver_] += amountToTransfer;
    }

     
    // function getTokensInExecutor(address _userToken) public {

    // }

}