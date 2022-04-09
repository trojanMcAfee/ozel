//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './pyERC20/pyERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../AppStorage.sol';
import '../libraries/FixedPointMathLib.sol';
import {IMulCurv, ITri} from '../interfaces/ICurve.sol';

import 'hardhat/console.sol';


contract ExecutorF { 

    AppStorage s;

    using FixedPointMathLib for uint;

    function calculateSlippage(
        uint amount_, 
        uint basisPoint_
    ) public view returns(uint minAmountOut) {
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


   function retrySwap(
        uint action_,
        uint amountIn_, 
        uint baseTokenOut_, 
        address tokenOut_
    ) public payable { //<----- must be payable
        if (action_ == 0) {
            for (uint i=0; i < 4; i++) {
                // console.log(i, ' try ---------');
                uint modSlippage = s.slippageTradingCurve * (i + 1);
                uint minOut = ITri(s.tricrypto).get_dy(2, baseTokenOut_, amountIn_);
                uint slippage = calculateSlippage(minOut, modSlippage);
                // IWETH(s.WETH).approve(s.tricrypto, amountIn_);
            
                try ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_, amountIn_ * 2, false) {
                    console.log('retry successful');
                    break;
                } catch (bytes memory err) { 

                    if (i != 3) {
                        continue;
                    } else {
                        console.log('WETH balance pre: ', IERC20(tokenOut_).balanceOf(msg.sender));
                        IERC20(tokenOut_).transfer(msg.sender, amountIn_); 
                        console.log('WETH balance post: ', IERC20(tokenOut_).balanceOf(msg.sender));
                        console.log('this one ****'); 
                    } 
        
                }
            }
        } else if (action_ == 1) {
            console.log('hi world');
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

}