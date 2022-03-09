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

// import '../interfaces/IWETH.sol';



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

    function _preSending(address _user) private {
        s.pendingWithdrawal[_user] = address(this).balance;
    }

    function _sendEtherToUser(address _user) public {
        _preSending(_user);
        uint amount = s.pendingWithdrawal[_user];
        s.pendingWithdrawal[_user] = 0;
        payable(_user).transfer(amount);
    }

    function _getFee(uint _amount) public returns(uint, uint) {
        uint fee = _amount - _amount._calculateSlippage(s.dappFee);
        s.feesVault += fee;
        uint netAmount = address(this).balance - fee;
        return (netAmount, fee);
    }

    function swapsRenForWBTC(uint _netAmount) public returns(uint wbtcAmount) {
        s.renBTC.approve(address(s.renPool), _netAmount);
        uint slippage = _netAmount._calculateSlippage(s.slippageTradingCurve); 
        s.renPool.exchange(0, 1, _netAmount, slippage);
        wbtcAmount = s.WBTC.balanceOf(address(this));
    }

    function swapsForUserToken(uint _amountIn, uint _tokenOut) public {
        // s.WBTC.approve(address(s.tricrypto), _amountIn);
        uint minOut = s.tricrypto.get_dy(2, _tokenOut, _amountIn);
        uint slippage = minOut._calculateSlippage(s.slippageTradingCurve);
        s.tricrypto.exchange{value: _amountIn}(2, _tokenOut, _amountIn, slippage, true);
    }

    /**
    BTC: 1 / USDT: 0 / WETH: 2
     */

    function exchangeToUserToken(address _user, address _userToken) external payable {
        updateManagerState(msg.value, _user);
        
        uint tokenOut = _userToken == address(s.USDT) ? 0 : 2;
        // bool useEth = _userToken == address(s.WETH) ? false : true; //can't be ETH
        IERC20 userToken;
        // if (_userToken != s.ETH) {
        userToken = IERC20(_userToken);
        // }

        //Swaps renBTC for WBTC
        // uint wbtcAmount = swapsRenForWBTC(_amount);

        //Sends fee (in WBTC) to Vault contract
        (uint netAmount, uint fee) = _getFee(msg.value);
        // require(isTransferred, 'Fee transfer failed');
        console.log(1);
        //Swaps WBTC to userToken (USDT, WETH or ETH)  
        swapsForUserToken(netAmount, tokenOut);
       console.log(2);
        //Sends userToken to user
        // if (_userToken != s.ETH) {
            uint ToUser = userToken.balanceOf(address(this));
            userToken.safeTransfer(_user, ToUser);
        // } else {
        // _sendEtherToUser(_user);
        // }
        console.log(3);
        console.log('fee: ', fee);
        s.WETH.deposit{value: fee}();
        //Deposits fees in Curve's renPool
        (bool success, ) = address(s.vault).delegatecall(
            abi.encodeWithSignature('depositInCurve(uint256)', fee)
        );
        require(success);
        console.log(4);
    }

    //connection PayMeFacethop with ManagerFacer
    

    //------- NEW FUNCTIONS---------//

    // function getOwnerDetailsFromL1(address _owner, address _userToken) external payable {
    //     s.currentUser = _owner;
    //     s.userToken = _userToken;
    // }
}