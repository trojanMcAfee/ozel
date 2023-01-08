// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;


import '@rari-capital/solmate/src/utils/FixedPointMathLib.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import { LibDiamond } from "../../libraries/LibDiamond.sol";
import { ITri } from '../../interfaces/arbitrum/ICurve.sol';
import '../../interfaces/arbitrum/IYtri.sol';
import './ozExecutorFacet.sol';
import '../AppStorage.sol';
import '../ozDiamond.sol';


/**
 * @dev Contract in charge of distrubting the revenue to the owner, depending
 * on the different revenue tiers.
 */
contract RevenueFacet {

    AppStorage s;

    using FixedPointMathLib for uint;
    using Address for address;

    event RevenueEarned(uint indexed amount);


    /*///////////////////////////////////////////////////////////////
                                Main
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Checks if enough fees have been charged in comparison to the revenue
     * tiers, and if it has reached a level, it'll start computing it (the revenue). 
     */
    function checkForRevenue() external payable { 
        (,int price,,,) = s.priceFeed.latestRoundData();

        for (uint j=0; j < s.revenueAmounts.length; j++) {
            if ((s.feesVault * 2) * uint(price) >= s.revenueAmounts[j] * 1 ether) {
                
                bytes memory data = abi.encodeWithSignature('getAUM(int256)', price);
                bytes memory returnData = address(this).functionCall(data);
                (uint yBalance, uint valueUM) = abi.decode(returnData, (uint, uint));

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

    /**
     * @notice Starts the computation of revenue for the owner by removing liquidity from Curve.
     * @dev It tries once and if it fails, it divides the amount to remove between two and tries again
     * using the same slippage. If both fail, it sends crv3crypto to the owner. 
     */
    function _computeRevenue(uint denominator_, uint balance_, uint price_) private {        
        address owner = LibDiamond.contractOwner(); 
        uint assetsToWithdraw = balance_ / denominator_;
        IYtri(s.yTriPool).withdraw(assetsToWithdraw);

        for (uint i=1; i <= 2; i++) {
            uint triAmountWithdraw = ITri(s.tricrypto).calc_withdraw_one_coin(assetsToWithdraw / i, 2); 
            uint minOut = ozExecutorFacet(s.executor).calculateSlippage(
                triAmountWithdraw, s.defaultSlippage
            ); 

            try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                uint balanceWETH = IERC20(s.WETH).balanceOf(address(this));

                    if (i == 2) {
                        try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                            balanceWETH = IERC20(s.WETH).balanceOf(address(this));
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

    /**
     * @notice Swaps the withdrawn liquidity, denominated in WETH, for the revenue token
     * @dev It tries once and if it fails, it divides the amount to swap between 2, multiplies, 
     * the slippage by 2 and tries again. If both fail, sends WETH to the owner.
     */
    function _swapWETHforRevenue(address owner_, uint balanceWETH_, uint price_) private {
        IERC20(s.WETH).approve(address(s.swapRouter), balanceWETH_);

        for (uint i=1; i <= 2; i++) {
            ISwapRouter.ExactInputSingleParams memory params =
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: s.WETH,
                    tokenOut: s.revenueToken, 
                    fee: s.poolFee, 
                    recipient: owner_,
                    deadline: block.timestamp,
                    amountIn: balanceWETH_ / i,
                    amountOutMinimum: _calculateMinOut(balanceWETH_, i, price_) / i, 
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

    /*///////////////////////////////////////////////////////////////
                                Helpers
    //////////////////////////////////////////////////////////////*/

    /// @dev Sends crv3crypto to the owner
    function _meh_sendMeTri(address owner_) private {
        uint balanceTri = IERC20(s.crvTricrypto).balanceOf(address(this));
        IERC20(s.crvTricrypto).transfer(owner_, balanceTri);
    }

    /// @dev Calculates the minimum amount to receive, based on the system's slippage
    function _calculateMinOut(uint balanceWETH_, uint i_, uint price_) private view returns(uint minOut) {
        uint expectedOut = balanceWETH_.mulDivDown(price_ * 10 ** 10, 1 ether);
        uint minOutUnprocessed = 
            expectedOut - expectedOut.mulDivDown(s.defaultSlippage * i_ * 100, 1000000); 
        minOut = minOutUnprocessed.mulWadDown(10 ** 6);
    }

    /// @dev Solidity implementation of the shift array method
    function _shiftAmounts(uint i_) private returns(uint) {
        uint element = s.revenueAmounts[i_];
        s.revenueAmounts[i_] = s.revenueAmounts[s.revenueAmounts.length - 1];
        delete s.revenueAmounts[s.revenueAmounts.length - 1];
        s.revenueAmounts.pop();
        return element;
    }
}


