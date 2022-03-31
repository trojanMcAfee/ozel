// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './facets/ERC20Facet/IERC20Facet.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './interfaces/IWETH.sol';


struct AppStorage { 
    //Contracts
    address PYY; 
    address tricrypto;
    address crvTricrypto; 
    address getters;
    address renPool;
    address mimPool;
    address crv2Pool;
    address yTriPool;
    address fraxPool;

    //ERC20s
    address USDT;
    address WBTC;
    address renBTC;
    address USDC;
    address MIM;
    // address PYY;
    address WETH;
    address FRAX;

    //System config
    uint dappFee;
    uint slippageOnCurve;
    uint slippageTradingCurve;
    uint totalVolume;
    uint distributionIndex;
    uint feesVault;

    mapping(address => uint) pendingWithdrawal;
    mapping(address => uint) usersPayments;
    mapping(bool => PYYERC20) py; 

    address ETH;
}

struct PYYERC20 {
    mapping(address => uint256) _balances;
    mapping(address => mapping(address => uint256)) _allowances;
    uint  _totalSupply;
    string  _name;
    string  _symbol;
}

