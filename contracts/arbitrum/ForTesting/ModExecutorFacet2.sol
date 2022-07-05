//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '../facets/oz20Facet.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../AppStorage.sol';
import '../../libraries/FixedPointMathLib.sol';
import {IMulCurv, ITri} from '../../interfaces/ICurve.sol';
import '../Modifiers.sol';

import 'hardhat/console.sol';


contract ModExecutorFacet2 is Modifiers { 

    using FixedPointMathLib for uint;


    function calculateSlippage(
        uint amount_, 
        uint basisPoint_
    ) public pure returns(uint minAmountOut) {
        minAmountOut = amount_ - amount_.mulDivDown(basisPoint_, 10000);
    }


    function executeFinalTrade( 
        TradeOps memory swapDetails_, 
        uint userSlippage_,
        uint lockNum_
    ) external payable isAuthorized(lockNum_) noReentrancy(3) {
        console.log(10);

        address pool = swapDetails_.pool;
        uint inBalance = IERC20(swapDetails_.baseToken).balanceOf(address(this));
        uint minOut;
        uint slippage;

        if (pool != s.renPool) IERC20(s.USDT).approve(pool, inBalance);

        /**** 
            Exchanges the amount between the user's slippage (final swap)
            If it fails, it doubles the slippage, divides the amount between two and tries again.
            If none works, sends the baseToken instead to the user.
        ****/ 
        for (uint i=1; i <= 2; i++) {
            console.log(11);
            if (pool == s.renPool || pool == s.crv2Pool) {

                minOut = IMulCurv(pool).get_dy(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i
                );
                slippage = calculateSlippage(minOut, userSlippage_ * i);

                try IMulCurv(pool).exchange(swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, slippage) {
                    console.log(9);
                    if (i == 2) {
                        console.log(1);
                        try IMulCurv(pool).exchange(swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, slippage) {
                            console.log(2);
                            break;
                        } catch {
                            console.log(3);
                            IERC20(swapDetails_.baseToken).transfer(msg.sender, inBalance / 2); //check if msg.sender should be changedd to user
                        }
                    }
                    console.log(4);
                    break;
                } catch {
                    console.log(5);
                    if (i == 1) {
                        console.log(6);
                        continue;
                    } else {
                        console.log(7);
                        IERC20(swapDetails_.baseToken).transfer(msg.sender, inBalance); 
                    }
                }
            } else {
                console.log(8);
                minOut = IMulCurv(pool).get_dy_underlying(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i
                );
                slippage = calculateSlippage(minOut, userSlippage_ * i);
                
                try IMulCurv(pool).exchange_underlying(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, slippage
                ) {
                    if (i == 2) {
                        try IMulCurv(pool).exchange_underlying(
                            swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, slippage
                        ) {
                            break;
                        } catch {
                            IERC20(swapDetails_.baseToken).transfer(msg.sender, inBalance / 2);
                        }
                    }
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        IERC20(swapDetails_.baseToken).transfer(msg.sender, inBalance); 
                    }
                }
            }
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
            s.totalVolume != 0 ? oneETH.mulDivDown((s.invariant2 * s.invariantRegulator), s.totalVolume) * (s.invariant * s.invariantRegulator) : 0; 

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

    function transferUserAllocation( //can someone modify s.isAuth?
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