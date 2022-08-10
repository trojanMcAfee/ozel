// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;


import '../../arbitrum/AppStorage.sol';


import '../../interfaces/IYtri.sol';
import {ITri} from '../../interfaces/ICurve.sol';
import { LibDiamond } from "../../libraries/LibDiamond.sol";
import './ExecutorFacetTest.sol';
// import '@rari-capital/solmate/src/utils/FixedPointMathLib.sol'; //<---- this one
import '../../libraries/FixedPointMathLib.sol';
import '../../libraries/ozERC20Lib.sol';



contract RevenueFacetTest {

    AppStorage s;

    using FixedPointMathLib for uint;
    using ozERC20Lib for IERC20;

    event RevenueEarned(uint indexed amount);


    //WETH: 2, USDT: 0
    function checkForRevenue() external payable {
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
                        uint denominator = s.revenueAmounts[i] == 10000000 ? 5 : 10; 
                        _computeRevenue(denominator, yBalance, uint(price));
                        uint deletedEl = _shiftAmounts(i); 
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

        uint triAmountWithdraw = ITri(s.tricrypto).calc_withdraw_one_coin(assetsToWithdraw, 2); 
        uint minOut = ExecutorFacetTest(s.executor).calculateSlippage(
            triAmountWithdraw, s.defaultSlippage
        ); 

        ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw, 2, minOut); 
        uint balanceWETH = IERC20(s.WETH).balanceOf(address(this));
        _swapWETHforRevenue(owner, balanceWETH, price_);
    }


    function _swapWETHforRevenue(address owner_, uint balanceWETH_, uint price_) private {
        // IERC20(s.WETH).approve(address(s.swapRouter), balanceWETH_);
        bool success = IERC20(s.WETH).ozApprove(
            address(s.swapRouter), owner_, balanceWETH_
        );

        if (success) {
            ISwapRouter.ExactInputSingleParams memory params =
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: s.WETH,
                    tokenOut: s.revenueToken, 
                    fee: s.poolFee, 
                    recipient: owner_,
                    deadline: block.timestamp,
                    amountIn: balanceWETH_,
                    amountOutMinimum: _calculateMinOut(balanceWETH_, 1, price_), 
                    sqrtPriceLimitX96: 0
                });

            s.swapRouter.exactInputSingle(params);
        }
    }


    function _meh_sendMeTri(address owner_) private {
        uint balanceTri = IERC20(s.crvTricrypto).balanceOf(address(this));
        IERC20(s.crvTricrypto).ozTransfer(owner_, balanceTri);
    }


    function _calculateMinOut(uint balanceWETH_, uint i_, uint price_) private view returns(uint minOut) {
        uint expectedOut = balanceWETH_.mulDivDown(price_ * 10 ** 10, 1 ether);
        uint minOutUnprocessed = 
            expectedOut - expectedOut.mulDivDown(s.defaultSlippage * i_ * 100, 1000000); 
        minOut = minOutUnprocessed.mulWadDown(10 ** 6);
    }


    function _shiftAmounts(uint i_) private returns(uint) {
        uint element = s.revenueAmounts[i_];
        s.revenueAmounts[i_] = s.revenueAmounts[s.revenueAmounts.length - 1];
        delete s.revenueAmounts[s.revenueAmounts.length - 1];
        s.revenueAmounts.pop();
        return element;
    }
}


