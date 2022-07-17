// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import './AppStorage.sol';

import 'hardhat/console.sol';

import '../interfaces/IYtri.sol';
import {ITri} from '../interfaces/ICurve.sol';
import { LibDiamond } from "../libraries/LibDiamond.sol";
import './facets/ExecutorFacet.sol';
// import '@rari-capital/solmate/src/utils/FixedPointMathLib.sol'; //<---- this one
import '../libraries/FixedPointMathLib.sol';



contract Revenue {

    AppStorage s;

    using FixedPointMathLib for uint;

    // function changeKaChing$$$() {}

    //WETH: 2, USDT: 0
    function _showMeTheMoney() internal {
        uint yBalance = IYtri(s.yTriPool).balanceOf(address(this));

        if (yBalance > 0) {
            (,int price,,,) = s.priceFeed.latestRoundData();

            uint priceShare = IYtri(s.yTriPool).pricePerShare();
            uint balanceCrv3 = (yBalance * priceShare) / 1 ether;

            uint triBalance = ITri(s.tricrypto).calc_withdraw_one_coin(balanceCrv3, 2);
            uint valueUM = triBalance * (uint(price) / 10 ** 8);

            console.log('valueUM: ', valueUM);
            console.log('feesVault: ', s.feesVault);

            for (uint i=0; i < s.revenueAmounts.length; i++) {

                if (valueUM >= (s.revenueAmounts[i] * 1 ether)) {
                    uint denominator = s.revenueAmounts[i] == 10000000 ? 5 : 10;
                    _computeRevenue(denominator, yBalance, uint(price));
                }

            }



            if (valueUM >= 250 * 1 ether) { //10000000 - 10m
                _computeRevenue(5, yBalance, uint(price));
            }  else if (valueUM >= 50000000 * 1 ether) { //50m
                _computeRevenue(10, yBalance, uint(price));
            } else if (valueUM >= 100000000 * 1 ether) { //100m
                _computeRevenue(10, yBalance, uint(price));
            } else if (valueUM >= 500000000 * 1 ether) { //500m
                _computeRevenue(10, yBalance, uint(price));
            } else if (valueUM >= 1000000000 * 1 ether) { //1b
                _computeRevenue(10, yBalance, uint(price));
            } else if (valueUM >= 5000000000 * 1 ether) { //5b
                _computeRevenue(10, yBalance, uint(price));
            } else if (valueUM >= 10000000000 * 1 ether) { //10b
                _computeRevenue(10, yBalance, uint(price));
            }
        }

       
            
    }

    function _computeRevenue(uint denominator_, uint balance_, uint price_) private {
        address owner;
        uint assetsToWithdraw = balance_ / denominator_;
        IYtri(s.yTriPool).withdraw(assetsToWithdraw);

        for (uint i=1; i <= 2; i++) {
            uint triAmountWithdraw = ITri(s.tricrypto).calc_withdraw_one_coin(assetsToWithdraw / i, 2); 
            uint minOut = ExecutorFacet(s.executor).calculateSlippage(
                triAmountWithdraw, s.defaultSlippage
            ); 

            try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                uint balanceWETH = IERC20(s.WETH).balanceOf(address(this));
                owner = LibDiamond.contractOwner();

                    if (i == 2) {
                        try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                            _swapWETHforRevenue(owner, balanceWETH, price_);
                            break;
                        } catch {
                            _meh_sendMeTri(owner); 
                        }
                    }
                    _swapWETHforRevenue(owner, balanceWETH, price_);
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        _meh_sendMeTri(owner); 
                    }
                }
        }
    }


    function _swapWETHforRevenue(address owner_, uint balanceWETH_, uint price_) private {
        for (uint i=1; i <= 2; i++) {
            ISwapRouter.ExactInputSingleParams memory params =
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: s.WETH,
                    tokenOut: s.revenueToken, //add to AppStorage and a way....
                    fee: s.poolFee, //add to AppStorage and a way to change it
                    recipient: owner_,
                    deadline: block.timestamp,
                    amountIn: balanceWETH_ / i,
                    amountOutMinimum: _calculateMinOut(balanceWETH_, i, price_), 
                    sqrtPriceLimitX96: 0
                });

            try s.swapRouter.exactInputSingle(params) {
                if (i == 2) {
                    try s.swapRouter.exactInputSingle(params) {
                        break;
                    } catch {
                        IERC20(s.WETH).transfer(owner_, balanceWETH_ / i);
                    }
                }
                console.log('here');
                break;
            } catch {
                if (i == 1) {
                    continue; 
                } else {
                    IERC20(s.WETH).transfer(owner_, balanceWETH_);
                }
            }
        }
    }


    function _meh_sendMeTri(address owner_) private {
        uint balanceTri = IERC20(s.crvTricrypto).balanceOf(address(this));
        IERC20(s.crvTricrypto).transfer(owner_, balanceTri);
    }


    function _calculateMinOut(uint balanceWETH_, uint i_, uint price_) private view returns(uint minOut) {
        uint expectedOut = balanceWETH_.mulDivDown(price_ * 10 ** 10, 1 ether);
        uint minOutUnprocessed = 
            expectedOut - expectedOut.mulDivDown(s.defaultSlippage * i_ * 100, 1000000); 
        minOut = minOutUnprocessed.mulWadDown(10 ** 6);
    }



}


// try eMode.swapRouter.exactInputSingle{value: address(this).balance}(params) {
//                 break;
//             } catch {
//                 if (i == 1) {
//                     unchecked { ++i; }
//                     continue; 
//                 } else {
//                     (bool success, ) = payable(userDetails.user).call{value: address(this).balance}('');
//                     if (!success) revert CallFailed('ozPayMe: Emergency ETH transfer failed');
//                     unchecked { ++i; }
//                 }
//             }




// struct EmergencyMode {
//         ISwapRouter swapRouter;
//         AggregatorV3Interface priceFeed; 
//         uint24 poolFee;
//         address tokenIn;
//         address tokenOut; 
//     }


//     function _calculateMinOut(
//         StorageBeacon.EmergencyMode memory eMode_, 
//         uint i_
//     ) private view returns(uint minOut) {
        // (,int price,,,) = eMode_.priceFeed.latestRoundData();
//         uint expectedOut = address(this).balance.mulDivDown(uint(price) * 10 ** 10, 1 ether);
//         uint minOutUnprocessed = 
//             expectedOut - expectedOut.mulDivDown(userDetails.userSlippage * i_ * 100, 1000000); 
//         minOut = minOutUnprocessed.mulWadDown(10 ** 6);
//     }