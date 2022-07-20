// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import '../AppStorage.sol';

import 'hardhat/console.sol';

import '../../interfaces/IYtri.sol';
import {ITri} from '../../interfaces/ICurve.sol';
import { LibDiamond } from "../../libraries/LibDiamond.sol";
import './ExecutorFacet.sol';
// import '@rari-capital/solmate/src/utils/FixedPointMathLib.sol'; //<---- this one
import '../../libraries/FixedPointMathLib.sol';



contract RevenueFacet {

    AppStorage s;

    using FixedPointMathLib for uint;

    event RevenueEarned(uint indexed amount);


    //WETH: 2, USDT: 0
    function checkForRevenue() external payable {
        console.log('start2');

        (,int price,,,) = s.priceFeed.latestRoundData();

        for (uint j=0; j < s.revenueAmounts.length; j++) {

            if ((s.feesVault * 2) * uint(price) >= s.revenueAmounts[j] * 1 ether) {
                uint yBalance = IYtri(s.yTriPool).balanceOf(address(this));
                uint priceShare = IYtri(s.yTriPool).pricePerShare();

                uint balanceCrv3 = (yBalance * priceShare) / 1 ether;
                uint triBalance = ITri(s.tricrypto).calc_withdraw_one_coin(balanceCrv3, 2);
                uint valueUM = triBalance * (uint(price) / 10 ** 8);

                for (uint i=0; i < s.revenueAmounts.length; i++) {
                    if (valueUM >= s.revenueAmounts[i] * 1 ether) {
                        uint denominator = s.revenueAmounts[i] == 10000000 ? 5 : 10; //250 instead of 10000000
                        _computeRevenue(denominator, yBalance, uint(price));
                        uint deletedEl = _shift(i);
                        emit RevenueEarned(deletedEl);
                    }
                }
                break;
            }
        }
    }


    function _computeRevenue(uint denominator_, uint balance_, uint price_) private {        
        address owner = LibDiamond.contractOwner(); 
        uint assetsToWithdraw = balance_ / denominator_;
        IYtri(s.yTriPool).withdraw(assetsToWithdraw);

        for (uint i=1; i <= 2; i++) {
            uint triAmountWithdraw = ITri(s.tricrypto).calc_withdraw_one_coin(assetsToWithdraw / i, 2); 
            uint minOut = ExecutorFacet(s.executor).calculateSlippage(
                triAmountWithdraw, s.defaultSlippage
            ); 

            try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                uint balanceWETH = IERC20(s.WETH).balanceOf(address(this));

                    if (i == 2) {
                        try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                            _swapWETHforRevenue(owner, balanceWETH, price_);
                            break;
                        } catch {
                            _meh_sendMeTri(owner); 
                            break;
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
        IERC20(s.WETH).approve(address(s.swapRouter), balanceWETH_);

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


    function _shift(uint i_) private returns(uint) {
        uint element = s.revenueAmounts[i_];
        s.revenueAmounts[i_] = s.revenueAmounts[s.revenueAmounts.length - 1];
        delete s.revenueAmounts[s.revenueAmounts.length - 1];
        s.revenueAmounts.pop();
        return element;
    }



}


