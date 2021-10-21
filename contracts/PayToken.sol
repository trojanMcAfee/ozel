//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

import {IRenPool, ITricrypto} from './interfaces/ICurve.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './Vault.sol';
import './libraries/Helpers.sol';

import 'hardhat/console.sol';


contract PayToken is ERC20 {

    /**** My variables ******/
    Vault vault;
    IRenPool renPool; 
    ITricrypto tricrypto2;
    IERC20 renBTC;
    IERC20 USDT;
    IERC20 WETH;
    IERC20 WBTC;
    address ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    IERC20 PYY;


    uint dappFee; //prev: 10 -> 0.1%
    uint totalVolume;
    uint distributionIndex;

    mapping(address => uint) pendingWithdrawal;
    mapping(address => uint) usersPayments;
    /***********/


    uint flag = 0;
    address public manager;


    constructor(address _manager) ERC20('PayToken', 'PYY') {
        // _mint(_manager, 100 * 1 ether);
        manager = _manager;
    }

    // modifier onlyManager {
    //     require(_msgSender() == manager, 'Manager not setting new balance');
    //     _;
    // }


    function _beforeTokenTransfer(
        address from, 
        address to, 
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);

        console.log('token flag: ', flag);
        flag++;
    }

    event Index(uint indexed x);
    function getHello(uint x) public {
        console.log('the number: ', x);
        emit Index(x);
    }


    function setNewBalance(uint _index, address _user) public {
        console.log('holzzz');
        // _balances[_user] = (_index * usersPayments[_user] * 100) * 1 ether;
        console.log('holaaaaa');
    }

    // function balanceOf(address account) public view override returns (uint256) {
    //     return (distributionIndex * usersPayments[account] * 100) * 1 ether;
    // }
}