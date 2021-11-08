// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './interfaces/IGatewayRegistry.sol';
import './interfaces/IGateway.sol';
import './facets/ManagerFacet.sol';
// import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import ''; // ----> set to IERC20Face and cont. on DiamondInit
import {IRenPool, ITricrypto} from './interfaces/ICurve.sol';
import './facets/VaultFacet.sol';


struct AppStorage {
    uint num;

    IGatewayRegistry registry;
    ManagerFacet manager; 
    ITricrypto tricrypto;
    VaultFacet vault;
    IRenPool renPool; 
    ICrvLpToken crvTricrypto;

    IERC20 renBTC;
    IERC20 USDT;
    IERC20 WETH;
    IERC20 WBTC;
    IERC20 PYY;

    address ETH;
    uint dappFee;
    uint slippageOnCurve;
    uint totalVolume;
    uint distributionIndex;

    mapping(address => uint) pendingWithdrawal;
    mapping(address => uint) usersPayments;



}

struct PYYERC20 {
    mapping(address => uint256) _balances;
    mapping(address => mapping(address => uint256)) _allowances;
    uint  _totalSupply;
    string  _name;
    string  _symbol;
}