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
import '../Errors.sol';

// import 'hardhat/console.sol';




contract Diamond { 

    AppStorage s;

    constructor(
        IDiamondCut.FacetCut[] memory _diamondCut, 
        address _contractOwner, 
        bytes memory _functionCall, 
        address _init,
        address[] memory nonRevenueFacets_ 
    ) payable {        
        LibDiamond.diamondCut(_diamondCut, _init, _functionCall);
        LibDiamond.setContractOwner(_contractOwner);
        LibDiamond.setNonRevenueFacets(nonRevenueFacets_);
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

        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;

        //with selector for checkRevenue()
        _filterRevenueCheck(
            facet, 
            ds.nonRevenueFacets, 
            ds.selectorToFacetAndPosition[0xbe795977].facetAddress 
        );

        // get facet from function selector
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


    function _filterRevenueCheck(
        address calledFacet_, 
        address[] memory nonRevenueFacets_, 
        address revenueFacet_
    ) private {
        bytes memory data = abi.encodeWithSignature('checkForRevenue()');
        uint length = nonRevenueFacets_.length;
        bool callFlag;

        for (uint i=0; i < length;) {
            if (calledFacet_ == nonRevenueFacets_[i]) {
                callFlag = true;
                break;
            }
            unchecked { ++i; }
        }

        if (!callFlag) {
            (bool success, ) = revenueFacet_.delegatecall(data); 
            if (!success) revert CallFailed('OZLDiamond: _filterRevenueCheck() failed');
        }
    }
}




