// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../interfaces/IWETH.sol';


struct AppStorage {
    //Contracts
    address OZL; 
    address tricrypto;
    address crvTricrypto; 
    address getters;
    address renPool;
    address mimPool;
    address crv2Pool;
    address yTriPool;
    address fraxPool;
    address executor;

    //ERC20s
    address USDT;
    address WBTC;
    address renBTC;
    address USDC;
    address MIM;
    address WETH;
    address FRAX;
    address ETH;

    //Token infrastructure
    address oz46;
    address oz20;

    //System config
    uint dappFee;
    uint defaultSlippage;
    mapping(address => bool) tokenDatabase;

    //Internal accounting vars
    uint totalVolume;
    uint distributionIndex;
    uint feesVault;
    uint failedFees;
    mapping(address => uint) usersPayments;

    OZLERC20 oz;

    //Curve swaps config
    TradeOps renSwap;
    TradeOps mimSwap;
    TradeOps usdcSwap;
    TradeOps fraxSwap;

    TradeOps[] swaps;

    bool isEnabled;
    bool isLocked;
}

struct OZLERC20 {
    mapping(address => uint256) balances_;
    mapping(address => mapping(address => uint256)) allowances_;
    uint  totalSupply_;
    string  name_;
    string  symbol_;
}

struct TradeOps {
    int128 tokenIn;
    int128 tokenOut;
    address baseToken;
    address userToken;  
    address pool;
}

struct userConfig {
    address user;
    address userToken;
    uint userSlippage; 
}

