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
import './facets/GettersFacet.sol';

import './libraries/Helpers.sol';


struct AppStorage {
    // uint num;

    IGatewayRegistry registry;
    ManagerFacet manager; 
    ITricrypto tricrypto;
    VaultFacet vault;
    IRenPool renPool; 
    ICrvLpToken crvTricrypto;
    PayMeFacet payme;
    GettersFacet getters;

    IERC20 renBTC;
    IERC20 USDT;
    IERC20 WETH;
    IERC20 WBTC;
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



// contract GettersFacet is DiamondInit {
//     // AppStorage public s;

//     // function diamondStorage() internal pure returns(AppStorage storage ds) {
//     //     assembly {
//     //         ds.slot := 0
//     //     }
//     // }

//     function getDistributionIndex() external view returns(uint) {
//         // AppStorage storage s = diamondStorage();
//         return s.distributionIndex;
//     }

//     function logVar() external view {
//         // AppStorage storage s = diamondStorage();
//         console.log('renBTC ex: ', address(s.renBTC));
//     }

// }

