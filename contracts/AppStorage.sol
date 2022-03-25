// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './facets/ManagerFacet.sol';
import './facets/ERC20Facet/IERC20Facet.sol';
import {
    IRen, 
    ITricrypto, 
    IMIM, 
    I2crv,
    IFrax
} from './interfaces/ICurve.sol';
import './facets/VaultFacet.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './facets/GettersFacet.sol';
import './interfaces/IWETH.sol';
import './interfaces/IYtricrypto.sol';


struct AppStorage { 
    ManagerFacet manager; 
    ITricrypto tricrypto;
    VaultFacet vault;
    ICrvLpToken crvTricrypto; //where does the interface here come from???
    GettersFacet getters;
    IRen renPool;
    IMIM mimPool;
    I2crv crv2Pool;
    IYtricrypto yTriPool;
    IFrax fraxPool;

    IERC20 USDT;
    IERC20 WBTC;
    IERC20 renBTC;
    IERC20 USDC;
    IERC20 MIM;
    IERC20Facet PYY;
    IWETH WETH;
    IERC20 FRAX;

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

