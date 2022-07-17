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
        // console.log('yBalance: ', yBalance);

        if (yBalance > 0) {
            uint denominator;
            uint assetsToWithdraw;
            address owner;
            (,int price,,,) = s.priceFeed.latestRoundData();

            uint priceShare = IYtri(s.yTriPool).pricePerShare();
            // console.log('priceShare: ', priceShare);
            uint balanceCrv3 = (yBalance * priceShare) / 1 ether;
            // console.log('balanceCrv3: ', balanceCrv3);

            console.log(1);
            uint triBalance = ITri(s.tricrypto).calc_withdraw_one_coin(balanceCrv3, 2);
            console.log(2);
            uint valueUM = triBalance * (uint(price) / 10 ** 8);

            if (valueUM >= 10000000 * 1 ether) {
                denominator = 5;
                assetsToWithdraw = yBalance / denominator;
                IYtri(s.yTriPool).withdraw(assetsToWithdraw);

                for (uint i=0; i < 2; i++) {
                    uint triAmountWithdraw = ITri(s.tricrypto).calc_withdraw_one_coin(assetsToWithdraw / i, 2); 
                    uint minOut = ExecutorFacet(s.executor).calculateSlippage(
                        triAmountWithdraw, s.defaultSlippage
                    ); 

                    try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                        uint balanceWETH = IERC20(s.WETH).balanceOf(address(this));
                        owner = LibDiamond.contractOwner();

                            if (i == 2) {
                                try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                                    _swapWETHforRevenue(owner, balanceWETH, uint(price));
                                    break;
                                } catch {
                                    _meh_sendMeTri(owner); 
                                }
                            }
                            _swapWETHforRevenue(owner, balanceWETH, uint(price));
                            break;
                        } catch {
                            if (i == 1) {
                                continue;
                            } else {
                                _meh_sendMeTri(owner); 
                            }
                        }
                }
            } else {
                console.log('came here');
            }    
        }
            
    }


    function _swapWETHforRevenue(address owner_, uint balanceWETH_, uint price_) private {
        for (uint i=0; i < 2; i++) {
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