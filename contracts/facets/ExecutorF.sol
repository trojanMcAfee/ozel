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
    ) public pure returns(uint minAmountOut) {
        minAmountOut = amount_ - amount_.mulDivDown(basisPoint_, 10000);
    }


    function _callCurve(
        string memory signature,
        int128 tokenIn_,
        int128 tokenOut_,
        uint inBalance_,
        uint slippage_
    ) public returns(uint) {
        (bool success, bytes memory data) = pool_.delegatecall(
            abi.encodeWithSignature(
                signature, 
                tokenIn_, tokenOut_, inBalance_, slippage_
            );
        );
        return abi.decode(data, (uint)); 
    }


    function _cautiousExec(
        uint dir_, 
        int128 tokenIn_, 
        int128 tokenOut_, 
        uint inBalance_,
        uint slippage_
        address pool_,
        uint userSlippage_,
        uint baseToken_,
        uint i_
    ) public {
        string memory signature = dir == 0 ?
            'get_dy(int128,int128,uint256)' :
            'get_dy_underlying(int128,int126,uint256)';

        uint minOut = _callCurve(signature, tokenIn_, tokenOut_, inBalance_);

        uint slippage = calculateSlippage(minOut, userSlippage_);
        signature = dir == 0 ?
            'exchange(int128,int128,uint256,uint256)' :
            'exchange_underlying(int128,int128,uint256,uint256)'

        try _callCurve(signature, tokenIn_, tokenOut_, inBalance_, slippage) {
            if (i_ == 2) {
                try _callCurve(signature, tokenIn_, tokenOut_, inBalance_, slippage) {
                    break;
                } catch {
                    IERC20(baseToken_).transfer(msg.sender, inBalance_ / 2);
                }
            }
            break;
        } catch {
            if (i_ == 1) {
                continue;
            } else {
                IERC20(baseToken_).transfer(msg.sender, inBalance_); 
            }
        }

    }



    function executeFinalTrade( 
        TradeOps memory swapDetails_, 
        uint userSlippage_
    ) public payable {
        uint userSlippage = userSlippage_ == 0 ? s.defaultSlipCurveTrad : userSlippage_;
        int128 tokenIn = swapDetails_.tokenIn;
        int128 tokenOut = swapDetails_.tokenOut;
        address baseToken = swapDetails_.baseToken;
        address pool = swapDetails_.pool;
        uint inBalance = IERC20(baseToken).balanceOf(address(this));
        uint minOut;
        uint slippage;

        if (pool != s.renPool) {
            IERC20(s.USDT).approve(pool, inBalance);
        }

        //Retries swap 5 times while increasing slippage in case it fails -----> modify this to be 4% slippage max
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