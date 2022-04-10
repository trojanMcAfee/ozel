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


    function _emergencyCall(uint i_, address baseToken_, uint inBalance_) private {
        if (i_ != 5) {
            continue;
        } else {
            console.log('USDT balance pre: ', IERC20(baseToken_).balanceOf(msg.sender));
            IERC20(baseToken_).transfer(msg.sender, inBalance_); 
            console.log('USDT balance post: ', IERC20(baseToken_).balanceOf(msg.sender));
            console.log('this one ****'); 
        }
    }



    function executeFinalTrade(TradeOps memory swapDetails_) public payable {
        uint minOut;
        uint slippage;
        uint inBalance = IERC20(swapDetails_.baseToken).balanceOf(address(this));

        if (swapDetails_.pool != s.renPool) {
            IERC20(s.USDT).approve(swapDetails_.pool, inBalance);
        }

        for (uint i=1; i <= 5; i++) {
            console.log(i, ' try ------');
            if (swapDetails_.pool == s.renPool || swapDetails_.pool == s.crv2Pool) {
                console.log(2);
                minOut = IMulCurv(swapDetails_.pool).get_dy(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance
                );
                slippage = calculateSlippage(minOut, s.slippageTradingCurve * i);
                try IMulCurv(swapDetails_.pool).exchange(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance, inBalance * 2
                ) {
                    console.log(3);
                    break;
                } catch {
                    _emergencyCall(i, swapDetails_.baseToken, inBalance);

                    // if (i != 5) {
                    //     continue;
                    // } else {
                    //     console.log('USDT balance pre: ', IERC20(swapDetails_.baseToken).balanceOf(msg.sender));
                    //     IERC20(swapDetails_.baseToken).transfer(msg.sender, inBalance); 
                    //     console.log('USDT balance post: ', IERC20(swapDetails_.baseToken).balanceOf(msg.sender));
                    //     console.log('this one ****'); 
                    // }
                }
            } else {
                console.log(1);
                minOut = IMulCurv(swapDetails_.pool).get_dy_underlying(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance
                );
                slippage = calculateSlippage(minOut, s.slippageTradingCurve * i);
                try IMulCurv(swapDetails_.pool).exchange_underlying(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance, type(uint).max
                ) {
                    console.log(4);
                    break;
                } catch {
                    console.log('here');
                    if (i != 5) {
                        continue;
                    } else {
                        console.log('USDT balance pre: ', IERC20(swapDetails_.baseToken).balanceOf(msg.sender));
                        IERC20(swapDetails_.baseToken).transfer(msg.sender, inBalance); 
                        console.log('USDT balance post: ', IERC20(swapDetails_.baseToken).balanceOf(msg.sender));
                        console.log('this one ^^^^^^^'); 
                    }
                }
            }
        }
    }


   function retrySwap(
        uint action_,
        uint amountIn_, 
        uint baseTokenOut_, 
        address tokenOut_
    ) public payable { //<----- must be payable
        // function _retry(uint j_) private {
        //     if (j_ == 0) {
        //         uint minOut = ITri(s.tricrypto).get_dy(2, baseTokenOut_, amountIn_);
        //         ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_, amountIn_ * 2, false);
        //     } else if (j_ == 1) {
        //             minOut = IMulCurv(swapDetails_.pool).get_dy(
        //             swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance
        //         );
        //         slippage = calculateSlippage(minOut, s.slippageTradingCurve);
        //         IMulCurv(swapDetails_.pool).exchange(
        //             swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance, slippage
        //         );
        //     } else if (j_ == 2) {
        //         minOut = IMulCurv(swapDetails_.pool).get_dy_underlying(
        //             swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance
        //         );
        //         slippage = calculateSlippage(minOut, s.slippageTradingCurve);
        //         IMulCurv(swapDetails_.pool).exchange_underlying(
        //             swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance, slippage
        //         ); //instead of putting the body of executeFinalTrade() here, try modifying the slippage on s.slipp..., and put executeFi() instead
        //     }
        // }


        if (action_ == 0) {
            for (uint i=0; i < 4; i++) {
                // console.log(i, ' try ---------');
                uint minOut = ITri(s.tricrypto).get_dy(2, baseTokenOut_, amountIn_);
                uint modSlippage = s.slippageTradingCurve * (i + 1);
                uint slippage = calculateSlippage(minOut, modSlippage);

            
                try ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_, amountIn_ * 2, false) { //<------ put retry() here
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