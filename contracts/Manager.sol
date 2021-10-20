//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IRenPool, ITricrypto} from './interfaces/ICurve.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './Vault.sol';
import './libraries/Helpers.sol';

import 'hardhat/console.sol';




contract Manager { 

    using SafeERC20 for IERC20;
    using Helpers for uint256;

    Vault vault;
    IRenPool renPool; 
    ITricrypto tricrypto2;
    IERC20 renBTC;
    IERC20 USDT;
    IERC20 WETH;
    IERC20 WBTC;
    address ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    IERC20 PYY;


    uint dappFee = 10; //prev: 10 -> 0.1%
    uint totalVolume;
    uint distributionIndex;

    // mapping(address => bool) users;
    mapping(address => uint) pendingWithdrawal;
    mapping(address => uint) usersPayments;

    struct MapParam {
        mapping(address => uint) x;
    }

   
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

    /*** Delete this function once you've moved all storages variables to a proxy ***/
    function setPYY(address _pyy) public {
        PYY = IERC20(_pyy);
    }
    /********/

    // function updatesPYYdistribution(address _user, uint _amountIn) public {

    //     usersPayments[_user] += _amountIn; //updates 'X'
        
    // }

    function updateIndex() private {
        distributionIndex = 1 / totalVolume;
    }



    // function _calculateSlippage(
    //     uint _amount, 
    //     uint _basisPoint
    // ) public pure returns(uint minAmountOut) {
    //     minAmountOut = _amount - ( (_amount * _basisPoint) / 10000 ); //5 -> 0.05%; 
    // }


    /***** Put it in Vault.sol *****/
    function withdrawUserShare(address _user, address _userToken) public {

    // remove_liquidity_one_coin(uint256 token_amount, uint256 i, uint256 min_amount)

    }
    /**************************/

    function _calculateAllocationPercentage(address _user) public view returns(uint) {
        return (((usersPayments[_user] * 10000) / totalVolume) * 1 ether) / 100;
    }



    // function _updateAllocationPercentage(
    //     uint _amount, 
    //     address _user
    // ) public returns(uint userAllocation) {
    //     usersPayments[_user] += _amount;
    //     totalVolume += _amount;
    //     userAllocation = _calculateAllocationPercentage(_user);
    // }

    function _updateAllocationPercentage(
        uint _amount, 
        address _user
    ) public {
        usersPayments[_user] += _amount;
        totalVolume += _amount;
        updateIndex();

        if (usersPayments[_user] == 0) {
            MapParam storage mappingParam;
            mappingParam.x = usersPayments; //either a struct or delegatecall

            PYY.setNewBalance(distributionIndex, _user); //pass mapping usersPayments to this function
        }
       
    }




    function _getDecimalPercentage(uint _userAllocation) public pure returns(uint) {
        return _userAllocation / 1 ether;
    }

    function _bytesToAddress(bytes memory _bytes) public pure returns (address addr) {
        assembly {
            addr := mload(add(_bytes,20))
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
        uint fee = _amount - _amount._calculateSlippage(dappFee); //10 -> 0.1%
        bool isTransferred = WBTC.transfer(address(vault), fee);
        uint netAmount = WBTC.balanceOf(address(this));
        return (netAmount, isTransferred);
    }


    /***** Helper swapping functions ******/
    function swapsRenForWBTC(uint _netAmount) public returns(uint wbtcAmount) {
        renBTC.approve(address(renPool), _netAmount); 
        uint slippage = _netAmount._calculateSlippage(5);
        renPool.exchange(0, 1, _netAmount, slippage);
        wbtcAmount = WBTC.balanceOf(address(this));
    }

    function swapsWBTCForUserToken(uint _wbtcToConvert, uint _tokenOut, bool _useEth) public {
        WBTC.approve(address(tricrypto2), _wbtcToConvert);
        uint minOut = tricrypto2.get_dy(1, _tokenOut, _wbtcToConvert);
        uint slippage = minOut._calculateSlippage(5);
        tricrypto2.exchange(1, _tokenOut, _wbtcToConvert, slippage, _useEth);
    }
    /*****************/

    



    function exchangeToUserToken(uint _amount, address _user, address _userToken) public {
        // uint userAllocation = _updateAllocationPercentage(_amount, _user);
        // console.log('user allocation %: ', _getDecimalPercentage(userAllocation));
        // console.log('user allocation: ', userAllocation);

        _updateAllocationPercentage(_amount, _user);
        
        uint tokenOut = _userToken == address(USDT) ? 0 : 2;
        bool useEth = _userToken == address(WETH) ? false : true;
        IERC20 userToken;
        if (_userToken != ETH) {
            userToken = IERC20(_userToken);
        }

        //Swaps renBTC for WBTC
        uint wbtcAmount = swapsRenForWBTC(_amount);
        
        //Sends fee (in WBTC) to Vault contract
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

        //Deposits fees in Curve's renPool
        vault.depositInCurve();

        // transferPYYtoUser(_user, userAllocation);

    }

    function transferPYYtoUser(address _user, uint _amount) public {
        PYY.transfer(_user, _amount);
        PYY.updateDistribution(_user);
    }


}