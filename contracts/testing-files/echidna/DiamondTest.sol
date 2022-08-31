// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../../arbitrum/Diamond.sol';
import { IDiamondCut } from "../../interfaces/IDiamondCut.sol";

import '../../arbitrum/facets/DiamondCutFacet.sol';
import '../../arbitrum/facets/DiamondLoupeFacet.sol';
import '../arbitrum/ExecutorFacetTest.sol';
import '../arbitrum/OZLFacetTest.sol';
import '../arbitrum/RevenueFacetTest.sol';


contract DiamondTest is Diamond {

    enum FacetCutAction {Add, Replace, Remove}
    // Add=0, Replace=1, Remove=2

    struct FacetCut {
        address facetAddress;
        FacetCutAction action;
        bytes4[] functionSelectors;
    }

    //an array of this with all facets and selectors

    IDiamondCut.FacetCut[] diamondCut = setDiamondCut();


    constructor() Diamond(
        diamondCut
    ) {

    }


    function setDiamondCut() public returns(IDiamondCut.FacetCut[] memory) {

        DiamondCutFacet diamondCutF = new DiamondCutFacet();
        bytes4[] memory cutSelectors = new bytes4[](6);
        cutSelectors[0] = diamondCutF.diamondCut.selector;
        cutSelectors[1] = diamondCutF.changeDappFee.selector;
        cutSelectors[2] = diamondCutF.changeDefaultSlippage.selector;
        cutSelectors[3] = diamondCutF.enableWithdrawals.selector;
        cutSelectors[4] = diamondCutF.changeRevenueToken.selector;
        cutSelectors[5] = diamondCutF.changeUniPoolFee.selector;

        DiamondLoupeFacet diamondLoupeF = new DiamondLoupeFacet();
        bytes4[] memory loupeSelectors = new bytes4[](8);
        loupeSelectors[0] = diamondLoupeF.facets.selector;
        loupeSelectors[1] = diamondLoupeF.facetFunctionSelectors.selector;
        loupeSelectors[2] = diamondLoupeF.facetAddresses.selector;
        loupeSelectors[3] = diamondLoupeF.facetAddress.selector;
        loupeSelectors[4] = diamondLoupeF.supportsInterface.selector;
        loupeSelectors[5] = diamondLoupeF.queryTokenDatabase.selector;
        loupeSelectors[6] = diamondLoupeF.queryTokenDatabase.selector;
        loupeSelectors[7] = diamondLoupeF.queryTokenDatabase.selector;

        ExecutorFacetTest executorTestF = new ExecutorFacetTest();
        bytes4[] memory executorSelectors = new bytes4[](5);
        executorSelectors[0] = executorTestF.calculateSlippage.selector;
        executorSelectors[1] = executorTestF.executeFinalTrade.selector;
        executorSelectors[2] = executorTestF.updateExecutorState.selector;
        executorSelectors[3] = executorTestF.modifyPaymentsAndVolumeExternally.selector;
        executorSelectors[4] = executorTestF.transferUserAllocation.selector;

        OZLFacetTest ozlTestF = new OZLFacetTest();
        bytes4[] memory ozlSelectors = new bytes4[](3);
        ozlSelectors[0] = ozlTestF.exchangeToUserToken.selector;
        ozlSelectors[1] = ozlTestF.withdrawUserShare.selector;
        ozlSelectors[2] = ozlTestF.addTokenToDatabase.selector;

        RevenueFacetTest revenueTestF = new RevenueFacetTest();
        bytes4[] memory revenueSelectors = new bytes4[](1);
        revenueSelectors[0] = revenueTestF.checkForRevenue.selector;

    }


}