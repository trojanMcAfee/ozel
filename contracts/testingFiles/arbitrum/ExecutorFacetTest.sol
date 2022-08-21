// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import '../../arbitrum/facets/oz20Facet.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../../arbitrum/AppStorage.sol';
import '../../libraries/FixedPointMathLib.sol';
import {IMulCurv, ITri} from '../../interfaces/ICurve.sol';
import { ModifiersARB } from '../../Modifiers.sol';


contract ExecutorFacetTest is ModifiersARB { 

    using FixedPointMathLib for uint;

    event DeadVariables(address user);


    function calculateSlippage(
        uint amount_, 
        uint basisPoint_
    ) public pure returns(uint minAmountOut) {
        minAmountOut = amount_ - amount_.mulDivDown(basisPoint_, 10000);
    }


    function executeFinalTrade( 
        TradeOps calldata swapDetails_, 
        uint userSlippage_,
        address user_,
        uint lockNum_
    ) external payable isAuthorized(lockNum_) noReentrancy(3) {
        emit DeadVariables(user_);
        address pool = swapDetails_.pool;
        uint inBalance = IERC20(swapDetails_.baseToken).balanceOf(address(this));
        uint minOut;
        uint slippage;

        IERC20(
            pool != s.renPool ? s.USDT : s.WBTC
        ).approve(pool, inBalance);

        if (pool == s.renPool || pool == s.crv2Pool) {
            minOut = IMulCurv(pool).get_dy(
                swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance
            );
            slippage = calculateSlippage(minOut, userSlippage_);

            IMulCurv(pool).exchange(
                swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance, slippage
            );  
        } else {
            minOut = IMulCurv(pool).get_dy_underlying(
                swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance
            );
            slippage = calculateSlippage(minOut, userSlippage_);
            
            IMulCurv(pool).exchange_underlying(
                swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance, slippage
            );
        }
        
    }

   

    //****** Modifies manager's STATE *****/

    function updateExecutorState(
        uint amount_, 
        address user_,
        uint lockNum_
    ) external payable isAuthorized(lockNum_) noReentrancy(2) {
        s.usersPayments[user_] += amount_;
        s.totalVolume += amount_;
        _updateIndex();
    }


    function _updateIndex() private { 
        uint oneETH = 1 ether;

        if (s.ozelIndex < 20 * oneETH && s.ozelIndex != 0) { 
            uint nextInQueueRegulator = s.invariantRegulator * 2; 

            if (nextInQueueRegulator <= s.invariantRegulatorLimit) { 
                s.invariantRegulator = nextInQueueRegulator; 
                s.indexRegulator++; 
            } else {
                s.invariantRegulator /= (s.invariantRegulatorLimit / 2);
                s.indexRegulator = 1; 
                s.indexFlag = s.indexFlag ? false : true;
                s.regulatorCounter++;
            }
        } 

        s.ozelIndex = 
            s.totalVolume != 0 ? 
            oneETH.mulDivDown((s.invariant2 * s.invariantRegulator), s.totalVolume) * (s.invariant * s.invariantRegulator) : 
            0; 

        s.ozelIndex = s.indexFlag ? s.ozelIndex : s.ozelIndex * s.stabilizer;
    }


    function modifyPaymentsAndVolumeExternally(
        address user_, 
        uint newAmount_,
        uint lockNum_
    ) external isAuthorized(lockNum_) noReentrancy(5) {
        s.usersPayments[user_] -= newAmount_;
        s.totalVolume -= newAmount_;
        _updateIndex();
    }

    function transferUserAllocation( 
        address sender_, 
        address receiver_, 
        uint amount_, 
        uint senderBalance_,
        uint lockNum_
    ) external isAuthorized(lockNum_) noReentrancy(7) { 
        uint percentageToTransfer = (amount_ * 10000) / senderBalance_;
        uint amountToTransfer = percentageToTransfer.mulDivDown(s.usersPayments[sender_] , 10000);

        s.usersPayments[sender_] -= amountToTransfer;
        s.usersPayments[receiver_] += amountToTransfer;
    }

}