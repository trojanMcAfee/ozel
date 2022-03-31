// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import {LibDiamond} from "../libraries/LibDiamond.sol";
import { IDiamondLoupe } from "../interfaces/IDiamondLoupe.sol";
import { IDiamondCut } from "../interfaces/IDiamondCut.sol";
import { IERC173 } from "../interfaces/IERC173.sol";
import { IERC165 } from "../interfaces/IERC165.sol";
import '../AppStorage.sol'; 
import '../facets/ManagerFacet.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import 'hardhat/console.sol';

import '../interfaces/IWETH.sol';



contract DiamondInit {    

    AppStorage internal s;
    // You can add parameters to this function in order to pass in 
    // data to set your own state variables
    function init(
        LibDiamond.Facets memory _facets,
        LibDiamond.VarsAndAddresses memory _vars
    ) external {
        // adding ERC165 data
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;

        //Ads selectors to Facets mapping
        for (uint i; i < _facets.selectors.length; i++) {
            bytes4[] memory selectors = _facets.selectors[i];
            for (uint j; j < selectors.length; j++) {
                ds.facets[selectors[j]] = _facets.addresses[i];
            }
        }

        //Sets addresses on contracts
        s.manager = _vars.contracts[0]; 
        s.tricrypto = _vars.contracts[1];
        s.crvTricrypto = _vars.contracts[2];
        s.getters = _vars.contracts[3];
        s.renPool = _vars.contracts[4];
        s.mimPool = _vars.contracts[5];
        s.crv2Pool = _vars.contracts[6];
        s.yTriPool = _vars.contracts[7];
        s.fraxPool = _vars.contracts[8];

        //Sets ERC20 instances
        s.USDT = _vars.erc20s[0];
        s.WBTC = _vars.erc20s[1];
        s.renBTC = _vars.erc20s[2];
        s.USDC = _vars.erc20s[3];
        s.MIM = _vars.erc20s[4];
        s.PYY = ManagerFacet(_vars.contracts[0]); //<------- modify
        s.WETH = _vars.erc20s[5];
        s.FRAX = _vars.erc20s[6];

        //Sets app's general variables
        s.dappFee = _vars.appVars[0];
        s.slippageOnCurve = _vars.appVars[1];
        s.slippageTradingCurve = _vars.appVars[2];

        //Sets name and symbol on PayToken (PYY)
        s.py[true]._name = _vars.pyyVars[0];
        s.py[true]._symbol = _vars.pyyVars[1];

        //Sets ETH address
        s.ETH = _vars.ETH;

        // add your own state variables 
        // EIP-2535 specifies that the `diamondCut` function takes two optional 
        // arguments: address _init and bytes calldata _calldata
        // These arguments are used to execute an arbitrary function using delegatecall
        // in order to set state variables in the diamond during deployment or an upgrade
        // More info here: https://eips.ethereum.org/EIPS/eip-2535#diamond-interface 
    }
}