//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './pyERC20/pyERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../AppStorage.sol';

import {IMulCurv} from '../interfaces/ICurve.sol';

import 'hardhat/console.sol';


contract ExecutorF { 

    AppStorage s;

    using SafeERC20 for IERC20;

    function calculateSlippage(
        uint _amount, 
        uint _basisPoint
    ) public pure returns(uint minAmountOut) {
        minAmountOut = _amount - ( (_amount * _basisPoint) / 10000 );  
    }

    function _tradeInCurve(address pool_, int128 tokenIn_, int128 tokenOut_, uint inBalance) public payable {
        uint minOut;
        uint slippage;
        if (pool_ != s.renPool) {
            IERC20(s.USDT).approve(pool_, inBalance);
        }

        if (pool_ == s.renPool || pool_ == s.crv2Pool) {
            minOut = IMulCurv(pool_).get_dy(tokenIn_, tokenOut_, inBalance);
            slippage = calculateSlippage(minOut, s.slippageTradingCurve);
            IMulCurv(pool_).exchange(tokenIn_, tokenOut_, inBalance, slippage);
        } else {
            minOut = IMulCurv(pool_).get_dy_underlying(tokenIn_, tokenOut_, inBalance);
            slippage = calculateSlippage(minOut, s.slippageTradingCurve);
            IMulCurv(pool_).exchange_underlying(tokenIn_, tokenOut_, inBalance, slippage);
        }
    }


    function executeFinalTrade(
        int128 tokenIn_, 
        int128 tokenOut_, 
        address erc20In_
    ) public payable {
        uint inBalance = IERC20(erc20In_).balanceOf(address(this));

        if (tokenIn_ == 0) {
            _tradeInCurve(s.renPool, tokenIn_, tokenOut_, inBalance);
        } else if (tokenIn_ == 1) {
            _tradeInCurve(s.crv2Pool, tokenIn_, tokenOut_, inBalance);
        } else if (tokenIn_ == 2) {
            _tradeInCurve(s.mimPool, tokenIn_, tokenOut_, inBalance);
        }
    }

    function executeFinalTrade( 
        int128 tokenIn_, 
        int128 tokenOut_, 
        address erc20In_, 
        address userToken_
    ) public payable {
        uint inBalance = IERC20(erc20In_).balanceOf(address(this));

        if (userToken_ == s.FRAX) {
            _tradeInCurve(s.fraxPool, tokenIn_, tokenOut_, inBalance);
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
        s.distributionIndex = 
            s.totalVolume != 0 ? ((1 ether * 10 ** 8) / s.totalVolume) : 0;
    }

    function modifyPaymentsAndVolumeExternally(address _user, uint _newAmount) external {
        s.usersPayments[_user] -= _newAmount;
        s.totalVolume -= _newAmount;
        _updateIndex();
    }

    function transferUserAllocation(address sender_, address receiver_, uint _amount, uint senderBalance_) public { 
        uint percentageToTransfer = (_amount * 10000) / senderBalance_;
        uint amountToTransfer = (percentageToTransfer * s.usersPayments[sender_]) / 10000;

        s.usersPayments[sender_] -= amountToTransfer;
        s.usersPayments[receiver_] += amountToTransfer;
    }

}