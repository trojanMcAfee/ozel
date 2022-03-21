//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IRenPool, ITricrypto} from '../interfaces/ICurve.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './VaultFacet.sol';
import '../libraries/Helpers.sol';
import '../AppStorage.sol';
import '../interfaces/ICrvLpToken.sol';
import '../interfaces/IWETH.sol';
// import '../interfaces/IRen.sol';

import 'hardhat/console.sol';




contract ManagerFacet { 
    AppStorage s; 

    using SafeERC20 for IERC20;
    using Helpers for uint256;
    using Helpers for address;


    function updateIndex() private {
        s.distributionIndex = ((1 ether * 10 ** 8) / s.totalVolume);
    }

    function modifyPaymentsAndVolumeExternally(address _user, uint _newAmount) external {
        s.usersPayments[_user] -= _newAmount;
        s.totalVolume -= _newAmount;
        updateIndex();
    }

    function updateManagerState(
        uint _amount, 
        address _user
    ) public {
        s.usersPayments[_user] += _amount;
        s.totalVolume += _amount;
        updateIndex();
    }

    function transferUserAllocation(address _sender, address _receiver, uint _amount) public {
        uint amountToTransfer = _getAllocationToTransfer(_amount, _sender);
        s.usersPayments[_sender] -= amountToTransfer;
        s.usersPayments[_receiver] += amountToTransfer;
    }

    function _getAllocationToTransfer(uint _amount, address _user) public returns(uint) {
        (bool success, bytes memory returnData) = address(s.PYY).delegatecall(
            abi.encodeWithSignature('balanceOf(address)', _user)
        );
        require(success);
        (uint balancePYY) = abi.decode(returnData, (uint));
        
        uint percentageToTransfer = (_amount * 10000) / balancePYY;
        return (percentageToTransfer * s.usersPayments[_user]) / 10000;
    }

    function _getFee(uint _amount) public returns(uint, uint) {
        uint fee = _amount - _amount._calculateSlippage(s.dappFee);
        s.feesVault += fee;
        uint netAmount = address(this).balance - fee;
        return (netAmount, fee);
    }

    function _finalRouteUserToken(uint _tokenIn, uint _tokenOut, IERC20 _contractIn) private {
        uint minOut = 
    }

    function swapsForUserToken(uint _amountIn, uint _tokenOut, address _userToken) public payable {

        uint minOut = s.tricrypto.get_dy(2, _tokenOut, _amountIn);
        uint slippage = minOut._calculateSlippage(s.slippageTradingCurve);
        s.tricrypto.exchange{value: _amountIn}(2, _tokenOut, _amountIn, slippage, true);

        if (_userToken == address(s.renBTC)) { //checking if I can define a struct in memory in this func and pass IERC20 + interface to _finalRouteUserToken()
            //renBTC: 1 / WBTC: 0
            uint tokenIn = 0;
            minOut = s.renPool.get_dy(tokenIn, 1, s.WBTC.balanceOf(address(this)));
            slippage = minOut._calculateSlippage(s.slippageTradingCurve);
            s.renPool.exchange(tokenIn, 1, s.WBTC.balanceOf(address(this)), slippage);
        } else if (_userToken == address(s.MIM)) {
            //MIM: 0 / USDT: 2 / USDC: 1
            tokenIn = 2;
            minOut = s.mimPool.get_dy(tokenIn, 0, s.USDT.balanceOf(address(this)));
            slippage = minOut._calculateSlippage(s.slippageTradingCurve);
            s.mimPool.exchange_underlying(tokenIn, 0, s.USDT.balanceOf(address(this)), slippage);
        } else if (_userToken == address(s.USDC)) {
            tokenIn = 2;
            minOut = s.mimPool.get_dy(tokenIn, 1, s.USDT.balanceOf(address(this)));
            slippage = minOut._calculateSlippage(s.slippageTradingCurve);
            s.mimPool.exchange_underlying(tokenIn, 1, s.USDT.balanceOf(address(this)), slippage);
        }


    }

    /**
    BTC: 1 / USDT: 0 / WETH: 2
     */

    function exchangeToUserToken(address _user, address _userToken) external payable {
        updateManagerState(msg.value, _user);
        uint tokenOut;

        if (_userToken == address(s.WBTC) || _userToken == address(s.renBTC)) {
            tokenOut = 1;
        } else {
            tokenOut = 0;
        }

        //Sends fee to Vault contract
        (uint netAmount, uint fee) = _getFee(msg.value);
        
        //Swaps ETH to userToken (USDT)  
        swapsForUserToken(netAmount, tokenOut, _userToken);
      
        //Sends userToken to user
        uint ToUser = IERC20(_userToken).balanceOf(address(this));
        IERC20(_userToken).safeTransfer(_user, ToUser);
        
        s.WETH.deposit{value: fee}();

        //Deposits fees in Curve's renPool
        (bool success, ) = address(s.vault).delegatecall(
            abi.encodeWithSignature('depositInCurve(uint256)', fee)
        );
        require(success);
    }

}