//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IRenPool, ITricrypto} from '../interfaces/ICurve.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './VaultFacet.sol';
import '../libraries/Helpers.sol';
import '../interfaces/ICrvLpToken.sol';
import '../AppStorage.sol';

import 'hardhat/console.sol';

import '../interfaces/IWETH.sol';



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

    function swapsForUserToken(uint _amountIn, uint _tokenOut) public payable {
        uint minOut = s.tricrypto.get_dy(2, _tokenOut, _amountIn);
        uint slippage = minOut._calculateSlippage(s.slippageTradingCurve);
        s.tricrypto.exchange{value: _amountIn}(2, _tokenOut, _amountIn, slippage, true);
    }

    /**
    BTC: 1 / USDT: 0 / WETH: 2
     */

    function exchangeToUserToken(address _user, address _userToken) external payable {
        updateManagerState(msg.value, _user);
        uint tokenOut;

        // if (_userToken == s.WBTC || _userToken == s.renBTC) {
        //     tokenOut = 1;
        // } else {
        //     tokenOut = 0;
        // }
        
        uint tokenOut = _userToken == address(s.USDT) ? 0 : 2;
        IERC20 userToken = IERC20(_userToken);

        //Sends fee to Vault contract
        (uint netAmount, uint fee) = _getFee(msg.value);
        
        //Swaps ETH to userToken (USDT)  
        swapsForUserToken(netAmount, tokenOut);
      
        //Sends userToken to user
        uint ToUser = IERC20(userToken).balanceOf(address(this));
        userToken.safeTransfer(_user, ToUser);
        
        s.WETH.deposit{value: fee}();

        //Deposits fees in Curve's renPool
        (bool success, ) = address(s.vault).delegatecall(
            abi.encodeWithSignature('depositInCurve(uint256)', fee)
        );
        require(success);
    }

}