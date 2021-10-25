//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IRenPool, ITricrypto} from './interfaces/ICurve.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './Vault.sol';
import './libraries/Helpers.sol';

import 'hardhat/console.sol';

import './interfaces/ICrvLpToken.sol';




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

    ICrvLpToken crvTricrypto = ICrvLpToken(0xc4AD29ba4B3c580e6D59105FFf484999997675Ff);



    uint dappFee = 10; //prev: 10 -> 0.1% / 100-1 / 1000-10 / 10000 - 100%
    uint public totalVolume;
    uint public distributionIndex;

    mapping(address => uint) pendingWithdrawal;
    mapping(address => uint) public usersPayments;

    
   
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




    function updateIndex() private {
        distributionIndex = ((1 ether * 10 ** 8) / totalVolume);
    }

    function modifyPaymentsAndVolumeExternally(address _user, uint _newAmount) external {
        usersPayments[_user] -= _newAmount;
        totalVolume -= _newAmount;
        updateIndex();
    }


    /*** On Helpers.sol ***/
    // function _calculateSlippage(
    //     uint _amount, 
    //     uint _basisPoint
    // ) public pure returns(uint minAmountOut) {
    //     minAmountOut = _amount - ( (_amount * _basisPoint) / 10000 ); //5 -> 0.05%; 
    // }


    // function _calculateAllocationPercentage(address _user) public view returns(uint) {
    //     return (((usersPayments[_user] * 10000) / totalVolume) * 1 ether) / 100;
    // }


    function updateManagerState(
        uint _amount, 
        address _user
    ) public {
        usersPayments[_user] += _amount;
        totalVolume += _amount;
        updateIndex();
    }

    function transferUserAllocation(address _sender, address _receiver, uint _amount) public {
        uint amountToTransfer = _getAllocationToTransfer(_amount, _sender);
        usersPayments[_sender] -= amountToTransfer;
        usersPayments[_receiver] += amountToTransfer;
    }

    function _getAllocationToTransfer(uint _amount, address _user) public view returns(uint) {
        uint percentageToTransfer = (_amount * 10000) / PYY.balanceOf(_user);
        return (percentageToTransfer * usersPayments[_user]) / 10000;
    }

   



    // function _getDecimalPercentage(uint _userAllocation) public pure returns(uint) {
    //     return _userAllocation / 1 ether;
    // }

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
        updateManagerState(_amount, _user);
        
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
        
    }


}