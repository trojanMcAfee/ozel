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


contract Diamond { 

    constructor(
        IDiamondCut.FacetCut[] memory _diamondCut, 
        address _contractOwner, 
        bytes memory _functionCall, 
        address _init
    ) payable {        
        LibDiamond.diamondCut(_diamondCut, _init, _functionCall);
        LibDiamond.setContractOwner(_contractOwner);
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable virtual { 
        LibDiamond.DiamondStorage storage ds;

        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        // get diamond storage
        assembly {
            ds.slot := position
        }

        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;

        // get facet from function selector
        require(facet != address(0), "ozDiamond: Function does not exist");
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




