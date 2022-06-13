//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './oz20Facet.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../AppStorage.sol';
import '../../libraries/FixedPointMathLib.sol';
import {IMulCurv, ITri} from '../../interfaces/ICurve.sol';

import 'hardhat/console.sol';


contract ExecutorF { 
    using FixedPointMathLib for uint;

    modifier noReentrancy(uint lockNum_) {
        require(!(s.isLocked[lockNum_]), "ExecutorF: No reentrance");
        s.isLocked[lockNum_] = true;
        _;
        s.isLocked[lockNum_]= false;
    }

    AppStorage s;


    function calculateSlippage(
        uint amount_, 
        uint basisPoint_
    ) public pure returns(uint minAmountOut) {
        minAmountOut = amount_ - amount_.mulDivDown(basisPoint_, 10000);
    }


    function executeFinalTrade( 
        TradeOps memory swapDetails_, 
        uint userSlippage_
    ) public payable {
        uint userSlippage = userSlippage_ == 0 ? s.defaultSlippage : userSlippage_;
        int128 tokenIn = swapDetails_.tokenIn;
        int128 tokenOut = swapDetails_.tokenOut;
        address baseToken = swapDetails_.baseToken;
        address pool = swapDetails_.pool;
        uint inBalance = IERC20(baseToken).balanceOf(address(this));
        uint minOut;
        uint slippage;

        if (pool != s.renPool) IERC20(s.USDT).approve(pool, inBalance);

        /**** 
            Exchanges the amount between the user's slippage (final swap)
            If it fails, it doubles the slippage, divides the amount between two and tries again.
            If none works, sends the baseToken instead to the user.
        ****/ 
        for (uint i=1; i <= 2; i++) {
            if (pool == s.renPool || pool == s.crv2Pool) {

                minOut = IMulCurv(pool).get_dy(tokenIn, tokenOut, inBalance / i);
                slippage = calculateSlippage(minOut, userSlippage * i);

                try IMulCurv(pool).exchange(tokenIn, tokenOut, inBalance / i, slippage) {
                    if (i == 2) {
                        try IMulCurv(pool).exchange(tokenIn, tokenOut, inBalance / i, slippage) {
                            break;
                        } catch {
                            IERC20(baseToken).transfer(msg.sender, inBalance / 2);
                        }
                    }
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        IERC20(baseToken).transfer(msg.sender, inBalance); 
                    }
                }
            } else {
                minOut = IMulCurv(pool).get_dy_underlying(tokenIn, tokenOut, inBalance / i);
                slippage = calculateSlippage(minOut, userSlippage * i);
                
                try IMulCurv(pool).exchange_underlying(tokenIn, tokenOut, inBalance / i, slippage) {
                    if (i == 2) {
                        try IMulCurv(pool).exchange_underlying(tokenIn, tokenOut, inBalance / i, slippage) {
                            break;
                        } catch {
                            IERC20(baseToken).transfer(msg.sender, inBalance / 2);
                        }
                    }
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        IERC20(baseToken).transfer(msg.sender, inBalance); 
                    }
                }
            }
        }
    }

   

    //****** Modifies manager's STATE *****/

    function updateExecutorState(
        uint amount_, 
        address user_
    ) external payable noReentrancy(2) {
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