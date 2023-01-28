// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import { LibDiamond } from "../libraries/LibDiamond.sol";
import '@openzeppelin/contracts/utils/Address.sol';
import './AppStorage.sol';
import '../Errors.sol';
import './Diamond.sol';


/**
 * @title Center of the system 
 * @notice Each call on L2 goes through here first for checking if there's enough
 * AUM for revenue computing 
 */
contract ozDiamond is Diamond {

    AppStorage s;

    using Address for address;

    constructor(
        IDiamondCut.FacetCut[] memory diamondCut_, 
        address owner_, 
        bytes memory functionCallData_, 
        address init_,
        address[] memory nonRevenueFacets_
    ) Diamond(
        diamondCut_,
        owner_,
        functionCallData_,
        init_
    ) {
        LibDiamond.setNonRevenueFacets(nonRevenueFacets_);
    }


    /**
     * @dev Checks if the facet to call belongs to the group that's not considered
     * for revenue computing. If it doesn't, it calls the current implementation of 
     * RevenueFacet.
     */
    function _filterRevenueCheck(
        address calledFacet_, 
        address[] memory nonRevenueFacets_, 
        address revenueFacet_
    ) private {
        uint length = nonRevenueFacets_.length;
        bool callFlag;

        for (uint i=0; i < length;) {
            if (calledFacet_ == nonRevenueFacets_[i]) {
                callFlag = true;
                break;
            }
            unchecked { ++i; }
        }

        if (!callFlag) revenueFacet_.functionDelegateCall(s.checkForRevenueSelec);
    }


    /**
     * @dev Filters out the call and forwards it to its designated implementation (aka facet).
     */
    fallback() external payable override {
        LibDiamond.DiamondStorage storage ds;

        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        
        assembly {
            ds.slot := position
        }

        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        _filterRevenueCheck(
            facet, 
            ds.nonRevenueFacets, 
            ds.selectorToFacetAndPosition[bytes4(s.checkForRevenueSelec)].facetAddress 
        );

        require(facet != address(0), "ozDiamond: Function does not exist");

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())

            switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }
}