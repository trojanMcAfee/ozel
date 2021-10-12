//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IRenPool, ITricrypto} from './interfaces/ICurve.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './Vault.sol';

import 'hardhat/console.sol';




contract Manager { 

    using SafeERC20 for IERC20;

    IRenPool renPool; 
    ITricrypto tricrypto2;
    IERC20 renBTC;
    IERC20 USDT;
    IERC20 WETH;
    IERC20 WBTC;
    address ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;


    uint dappFee = 10;
    uint totalVolume = 0;
    Vault vault;

    mapping(address => bool) users;
    mapping(address => uint) pendingWithdrawal;
    mapping(address => uint) usersPayments;

   
    constructor(
        address _vault,
        address _renPool,
        address _tricrypto,
        address _renBTC,
        address _usdt,
        address _weth,
        address _wbtc
    ) {
        vault = Vault(_vault);
        renPool = IRenPool(_renPool);
        tricrypto2 = ITricrypto(_tricrypto);
        renBTC = IERC20(_renBTC);
        USDT = IERC20(_usdt);
        WETH = IERC20(_weth);
        WBTC = IERC20(_wbtc);
    }



    function _calculateAfterPercentage(
        uint _amount, 
        uint _basisPoint
    ) public pure returns(uint result) {
        result = _amount - ( (_amount * _basisPoint) / 10000 ); //5 -> 0.05%;
    }

    function _calculateAllocationPercentage(
        uint _amount, 
        address _user
    ) public returns(uint userAllocation) {
        usersPayments[_user] += _amount;
        totalVolume += _amount;
        userAllocation = ( (usersPayments[_user] * 10000) / totalVolume ) * 1 ether;
    }

    function _bytesToAddress(bytes memory bys) public pure returns (address addr) {
        assembly {
            addr := mload(add(bys,20))
        } 
    }

    function _preSending(address _user) private {
        pendingWithdrawal[_user] = address(this).balance;
    }

    function _sendEtherToUser(address _user) public {
        _preSending(_user);
        uint amount = pendingWithdrawal[_user];
        pendingWithdrawal[_user] = 0;
        payable(_user).transfer(amount);
    }

    function _getFee(uint _amount) public returns(uint, bool) {
        uint fee = _amount - _calculateAfterPercentage(_amount, dappFee); //10 -> 0.1%
        bool isTransferred = WBTC.transfer(address(vault), fee);
        // uint netAmount = _amount - fee;
        uint netAmount = WBTC.balanceOf(address(this));
        return (netAmount, isTransferred);
    }

    function swapsRenForWBTC(uint _netAmount) public returns(uint wbtcAmount) {
        renBTC.approve(address(renPool), _netAmount); 
        uint slippage = _calculateAfterPercentage(_netAmount, 5);
        renPool.exchange(0, 1, _netAmount, slippage);
        wbtcAmount = WBTC.balanceOf(address(this));
    }

    function swapsWBTCForUserToken(uint _wbtcToConvert, uint _tokenOut, bool _useEth) public {
        WBTC.approve(address(tricrypto2), _wbtcToConvert);
        uint minOut = tricrypto2.get_dy(1, _tokenOut, _wbtcToConvert);
        uint slippage = _calculateAfterPercentage(minOut, 5);
        tricrypto2.exchange(1, _tokenOut, _wbtcToConvert, slippage, _useEth);
    }

    function exchangeToUserToken(uint _amount, address _user, address _userToken) public {
        uint userAllocation = _calculateAllocationPercentage(_amount, _user);
        
        uint tokenOut = _userToken == address(USDT) ? 0 : 2;
        bool useEth = _userToken == address(WETH) ? false : true;
        IERC20 userToken;
        if (_userToken != ETH) {
            userToken = IERC20(_userToken);
        }

        //Swaps renBTC for WBTC
        uint wbtcAmount = swapsRenForWBTC(_amount);

        // Sends fee to Vault contract
        (uint netAmount, bool isTransferred) = _getFee(wbtcAmount);
        require(isTransferred, 'Fee transfer failed');

        //Swaps WBTC to userToken (USDT, WETH or ETH)  
        swapsWBTCForUserToken(netAmount, tokenOut, useEth); 

        //Sends userToken to user
        if (_userToken != ETH) {
            uint ToUser = userToken.balanceOf(address(this));
            userToken.safeTransfer(_user, ToUser);
        } else {
            _sendEtherToUser(_user);
        }
        console.log('USDT balance on user: ', USDT.balanceOf(_user) / 10 ** 6);
        console.log('ETH balance on user: ', _user.balance / 1 ether);
        console.log('WETH balance on user: ', WETH.balanceOf(_user) / 1 ether);
    }


}