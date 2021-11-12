// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './interfaces/IGatewayRegistry.sol';
import './interfaces/IGateway.sol';
import './facets/ManagerFacet.sol';
import './facets/ERC20Facet/IERC20Facet.sol';
import {IRenPool, ITricrypto} from './interfaces/ICurve.sol';
import './facets/VaultFacet.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './facets/PayMeFacet.sol';

import './libraries/Helpers.sol';


struct AppStorage {
    uint num;

    IGatewayRegistry registry;
    ManagerFacet manager; 
    ITricrypto tricrypto;
    VaultFacet vault;
    IRenPool renPool; 
    ICrvLpToken crvTricrypto;
    PayMeFacet payme;
    Getters getters;

    IERC20 renBTC;
    IERC20 USDT;
    IERC20 WETH;
    IERC20 WBTC;
    IERC20Facet PYY;

    uint dappFee;
    uint slippageOnCurve;
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

contract Getters {
    AppStorage s;

    function getDistributionIndex() external view returns(uint) {
        return s.distributionIndex;
    }

    

    function getVar(uint _netAmount) external {
        
        console.log('msg.sender: ', msg.sender);
        console.log('address(this): ', address(this));
        
        s.renBTC.approve(address(s.renPool), _netAmount);
        console.log('allowance: ', s.renBTC.allowance(address(s.manager), address(s.renPool)));
        revert('fooozz');

    }


    


    

}