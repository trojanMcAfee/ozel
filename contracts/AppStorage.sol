// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './interfaces/IGatewayRegistry.sol';
import './interfaces/IGateway.sol';
import './Manager.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IRenPool, ITricrypto} from './interfaces/ICurve.sol';
import './Vault.sol';


struct AppStorage {
    address ETH;
    uint num;

    IGatewayRegistry registry;
    Manager manager; 
    IERC20 renBTC;

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

    Manager manager;


}