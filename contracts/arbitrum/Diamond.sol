// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import { LibDiamond } from "../libraries/LibDiamond.sol";
import { IDiamondCut } from "../interfaces/IDiamondCut.sol";
import { IDiamondLoupe } from "../interfaces/IDiamondLoupe.sol";
import { IERC173 } from "../interfaces/IERC173.sol";
import './AppStorage.sol';

import 'hardhat/console.sol';



contract Diamond { 

    AppStorage s;


    constructor(
        IDiamondCut.FacetCut[] memory _diamondCut, 
        address _contractOwner, 
        bytes memory _functionCall, 
        address _init
    ) payable {        
        // bytes4[] memory x = _diamondCut[2].functionSelectors;
        // for (uint i=0; i < x.length; i++) {
        //     console.logBytes4(x[i]);
        // }
        // console.log('selectors in constructor ^^^^^^');


        LibDiamond.diamondCut(_diamondCut, _init, _functionCall);
        LibDiamond.setContractOwner(_contractOwner);

        // LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        // bytes4[] memory y = ds.facetFunctionSelectors[0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6].functionSelectors;
        // console.log('^^^^^^^^^');
        // for (uint i=0; i < y.length; i++) {
        //     console.logBytes4(y[i]);
        // }
        // console.log('selectors in constructorrr ^^^^^^');


    }


    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable { 
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        // get diamond storage
        assembly {
            ds.slot := position
        }
        // get facet from function selector
        // address facet = ds.facets[msg.sig];

        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        console.log('facet of msg.sig: ', facet);



        require(facet != address(0), "Diamond: Function does not exist");
        // Execute external function from facet using delegatecall and return any value.
        assembly {
            // copy function selector and any arguments
            calldatacopy(0, 0, calldatasize())
            // execute function call using the facet
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            // get any return value
            returndatacopy(0, 0, returndatasize())
            // return any return value or error back to the caller
            switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }

    receive() external payable {}
}
