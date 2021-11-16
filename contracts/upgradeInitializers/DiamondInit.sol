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

import 'hardhat/console.sol';


import '../AppStorage.sol'; 
// import {GettersFacet} from '../AppStorage.sol'; 

import '../interfaces/IGatewayRegistry.sol';
import '../interfaces/IGateway.sol';
import '../facets/ManagerFacet.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IRenPool, ITricrypto} from '../interfaces/ICurve.sol';
import '../facets/VaultFacet.sol';
import '../facets/ERC20Facet/IERC20Facet.sol';
import '../interfaces/ICrvLpToken.sol';
import '../facets/PayMeFacet.sol';


// It is exapected that this contract is customized if you want to deploy your diamond
// with data from a deployment script. Use the init function to initialize state variables
// of your diamond. Add parameters to the init funciton if you need to.

contract DiamondInit {    

    AppStorage s;
    // You can add parameters to this function in order to pass in 
    // data to set your own state variables
    function init(
        LibDiamond.Facets memory _facets,
        LibDiamond.VarsAndAddresses memory _vars
    ) external {
        console.log('yatzi');
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

        //TODO: add addresses to DiamondStorage()

        //Sets addresses on contracts
        s.registry = IGatewayRegistry(_vars.contracts[0]);
        s.manager = ManagerFacet(_vars.contracts[1]);
        s.tricrypto = ITricrypto(_vars.contracts[2]);
        s.vault = VaultFacet(_vars.contracts[3]);
        s.renPool = IRenPool(_vars.contracts[4]);
        s.crvTricrypto = ICrvLpToken(_vars.contracts[5]);
        s.payme = PayMeFacet(payable(_vars.contracts[6]));
        // s.getters = GettersFacet(_vars.contracts[7]);

        //Sets ERC20 instances
        s.renBTC = IERC20(_vars.erc20s[0]);
        s.USDT = IERC20(_vars.erc20s[1]);
        s.WETH = IERC20(_vars.erc20s[2]);
        s.WBTC = IERC20(_vars.erc20s[3]);
        s.PYY = IERC20Facet(_vars.erc20s[4]);

        //Sets app's general variables
        s.dappFee = _vars.appVars[0];
        s.slippageOnCurve = _vars.appVars[1];

        //Sets name and symbol on PayToken (PYY)
        s.py[true]._name = _vars.pyyVars[0];
        s.py[true]._symbol = _vars.pyyVars[1];

        //Sets ETH address
        s.ETH = _vars.ETH;
        

        console.log('selector: ');
        // revert('hereee');

        console.log('zzzzzzz');

        // add your own state variables 
        // EIP-2535 specifies that the `diamondCut` function takes two optional 
        // arguments: address _init and bytes calldata _calldata
        // These arguments are used to execute an arbitrary function using delegatecall
        // in order to set state variables in the diamond during deployment or an upgrade
        // More info here: https://eips.ethereum.org/EIPS/eip-2535#diamond-interface 
    }


}