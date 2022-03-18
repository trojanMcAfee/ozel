// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './facets/ManagerFacet.sol';
import './facets/ERC20Facet/IERC20Facet.sol';
import {IRenPool, ITricrypto} from './interfaces/ICurve.sol';
import './facets/VaultFacet.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
// import './facets/PayMeFacet.sol';
import './facets/GettersFacet.sol';

import './interfaces/IWETH.sol';

struct AppStorage {
    ManagerFacet manager; 
    ITricrypto tricrypto;
    VaultFacet vault;
    ICrvLpToken crvTricrypto;
    GettersFacet getters;

    IERC20 USDT;
    IWETH WETH;
    IERC20Facet PYY;

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

