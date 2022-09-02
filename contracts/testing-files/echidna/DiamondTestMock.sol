pragma solidity 0.8.14;


import './DiamondMock.sol';

import '../../arbitrum/Diamond.sol';
import { IDiamondCut } from "../../interfaces/IDiamondCut.sol";
// import '../../arbitrum/upgradeInitializers/DiamondInit.sol';
import './InitMock.sol';
import '../../arbitrum/facets/DiamondCutFacet.sol';
import '../../arbitrum/facets/DiamondLoupeFacet.sol';
import '../arbitrum/ExecutorFacetTest.sol';
import '../../arbitrum/facets/OwnershipFacet.sol';
import '../arbitrum/OZLFacetTest.sol';
import '../arbitrum/RevenueFacetTest.sol';
import '../../arbitrum/facets/oz20Facet.sol';
import '../../arbitrum/facets/oz4626Facet.sol';


contract DiamondTestMock is DiamondMock {

    address owner = address(this);
    address[] nonRevenueFacets;

    bytes functionCall = hex'a15a2d230000000000000000000000000000000000000000000000000000000000000017';

    constructor() DiamondMock(
        setDiamondCut(),
        owner,
        functionCall,
        setInit(),
        nonRevenueFacets
    ) {}


    function setNonRevenueFacets() public returns(address[] memory facets) { //works (original)
        facets = new address[](4);

        DiamondCutFacet diamondCutF = new DiamondCutFacet();
        facets[0] = address(diamondCutF);
        DiamondLoupeFacet diamondLoupeF = new DiamondLoupeFacet();
        facets[1] = address(diamondLoupeF);
        OwnershipFacet ownershipF = new OwnershipFacet();
        facets[2] = address(ownershipF);
        RevenueFacetTest revenueTestF = new RevenueFacetTest();
        facets[3] = address(revenueTestF);
    }

    function setInit() public returns(address) { //works
        InitMock initContract = new InitMock();
        return address(initContract);
    }

    // function setDiamondCut() public returns(IDiamondCut.FacetCut[] memory diamondCutInt) { //works
    //     nonRevenueFacets = setNonRevenueFacets(); //works

    //     bytes4[] memory selectors = new bytes4[](1);
    //     selectors[0] = 0xb7760c8f;

    //     IDiamondCut.FacetCut memory cut = IDiamondCut.FacetCut({
    //         facetAddress: nonRevenueFacets[0],
    //         action: IDiamondCut.FacetCutAction.Add,
    //         functionSelectors: selectors
    //     });
    //     IDiamondCut.FacetCut memory cut1 = IDiamondCut.FacetCut({
    //         facetAddress: nonRevenueFacets[1],
    //         action: IDiamondCut.FacetCutAction.Add,
    //         functionSelectors: selectors
    //     });

    //     diamondCutInt = new IDiamondCut.FacetCut[](2);
    //     diamondCutInt[0] = cut;
    //     diamondCutInt[1] = cut1;
    // }

    function setDiamondCut() public returns(IDiamondCut.FacetCut[] memory) { //works (original)
        IDiamondCut.FacetCut[] memory diamondCutInt = new IDiamondCut.FacetCut[](8);
        IDiamondCut.FacetCut memory cut;

        nonRevenueFacets = setNonRevenueFacets();

        bytes4[] memory cutSelectors = new bytes4[](6);
        cutSelectors[0] = DiamondCutFacet(nonRevenueFacets[0]).diamondCut.selector;
        cutSelectors[1] = DiamondCutFacet(nonRevenueFacets[0]).changeDappFee.selector;
        cutSelectors[2] = DiamondCutFacet(nonRevenueFacets[0]).changeDefaultSlippage.selector;
        cutSelectors[3] = DiamondCutFacet(nonRevenueFacets[0]).enableWithdrawals.selector;
        cutSelectors[4] = DiamondCutFacet(nonRevenueFacets[0]).changeRevenueToken.selector;
        cutSelectors[5] = DiamondCutFacet(nonRevenueFacets[0]).changeUniPoolFee.selector;
        cut = IDiamondCut.FacetCut({
            facetAddress: nonRevenueFacets[0],
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: cutSelectors
        });
        diamondCutInt[0] = cut;
        // diamondCut.push(cut);

        bytes4[] memory loupeSelectors = new bytes4[](8);
        loupeSelectors[0] = DiamondLoupeFacet(nonRevenueFacets[1]).facets.selector;
        loupeSelectors[1] = DiamondLoupeFacet(nonRevenueFacets[1]).facetFunctionSelectors.selector;
        loupeSelectors[2] = DiamondLoupeFacet(nonRevenueFacets[1]).facetAddresses.selector;
        loupeSelectors[3] = DiamondLoupeFacet(nonRevenueFacets[1]).facetAddress.selector;
        loupeSelectors[4] = DiamondLoupeFacet(nonRevenueFacets[1]).supportsInterface.selector;
        loupeSelectors[5] = DiamondLoupeFacet(nonRevenueFacets[1]).queryTokenDatabase.selector;
        loupeSelectors[6] = DiamondLoupeFacet(nonRevenueFacets[1]).queryTokenDatabase.selector;
        loupeSelectors[7] = DiamondLoupeFacet(nonRevenueFacets[1]).queryTokenDatabase.selector;
        cut = IDiamondCut.FacetCut({
            facetAddress: nonRevenueFacets[1],
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: loupeSelectors
        });
        diamondCutInt[1] = cut;
        // diamondCut.push(cut);

        ExecutorFacetTest executorTestF = new ExecutorFacetTest();
        bytes4[] memory executorSelectors = new bytes4[](5);
        executorSelectors[0] = executorTestF.calculateSlippage.selector;
        executorSelectors[1] = executorTestF.executeFinalTrade.selector;
        executorSelectors[2] = executorTestF.updateExecutorState.selector;
        executorSelectors[3] = executorTestF.modifyPaymentsAndVolumeExternally.selector;
        executorSelectors[4] = executorTestF.transferUserAllocation.selector;
        cut = IDiamondCut.FacetCut({
            facetAddress: address(executorTestF),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: executorSelectors
        });
        diamondCutInt[2] = cut;
        // diamondCut.push(cut);

        bytes4[] memory ownershipSelectors = new bytes4[](2);
        ownershipSelectors[0] = OwnershipFacet(nonRevenueFacets[2]).transferOwnership.selector;
        ownershipSelectors[1] = OwnershipFacet(nonRevenueFacets[2]).owner.selector;
        cut = IDiamondCut.FacetCut({
            facetAddress: nonRevenueFacets[2],
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: ownershipSelectors
        });
        diamondCutInt[3] = cut;
        // diamondCut.push(cut);

        oz20Facet oz20F = new oz20Facet();
        bytes4[] memory oz20Selectors = new bytes4[](12);
        oz20Selectors[0] = oz20F.name.selector;
        oz20Selectors[1] = oz20F.symbol.selector;
        oz20Selectors[2] = oz20F.decimals.selector;
        oz20Selectors[3] = oz20F.totalSupply.selector;
        oz20Selectors[4] = oz20F.balanceOf.selector;
        oz20Selectors[5] = oz20F.transfer.selector;
        oz20Selectors[6] = oz20F.allowance.selector;
        oz20Selectors[7] = oz20F.approve.selector;
        oz20Selectors[8] = oz20F.transferFrom.selector;
        oz20Selectors[9] = oz20F.increaseAllowance.selector;
        oz20Selectors[10] = oz20F.decreaseAllowance.selector;
        oz20Selectors[11] = oz20F.burn.selector;
        cut = IDiamondCut.FacetCut({
            facetAddress: address(oz20F),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: oz20Selectors
        });
        diamondCutInt[4] = cut;
        // diamondCut.push(cut);

        oz4626Facet oz4626F = new oz4626Facet();
        bytes4[] memory oz4626Selectors = new bytes4[](10);
        oz4626Selectors[0] = oz4626F.deposit.selector;
        oz4626Selectors[1] = oz4626F.redeem.selector;
        oz4626Selectors[2] = oz4626F.convertToShares.selector;
        oz4626Selectors[3] = oz4626F.convertToAssets.selector;
        oz4626Selectors[4] = oz4626F.previewDeposit.selector;
        oz4626Selectors[5] = oz4626F.previewRedeem.selector;
        oz4626Selectors[6] = oz4626F.maxDeposit.selector;
        oz4626Selectors[7] = oz4626F.maxMint.selector;
        oz4626Selectors[8] = oz4626F.maxWithdraw.selector;
        oz4626Selectors[9] = oz4626F.maxRedeem.selector;
        cut = IDiamondCut.FacetCut({
            facetAddress: address(oz4626F),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: oz4626Selectors
        });
        diamondCutInt[5] = cut;
        // diamondCut.push(cut);

        OZLFacetTest ozlTestF = new OZLFacetTest();
        bytes4[] memory ozlSelectors = new bytes4[](3);
        ozlSelectors[0] = ozlTestF.exchangeToUserToken.selector;
        ozlSelectors[1] = ozlTestF.withdrawUserShare.selector;
        ozlSelectors[2] = ozlTestF.addTokenToDatabase.selector;
        cut = IDiamondCut.FacetCut({
            facetAddress: address(ozlTestF),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: ozlSelectors
        });
        diamondCutInt[6] = cut;
        // diamondCut.push(cut);

        bytes4[] memory revenueSelectors = new bytes4[](1);
        revenueSelectors[0] = RevenueFacetTest(nonRevenueFacets[3]).checkForRevenue.selector;
        cut = IDiamondCut.FacetCut({
            facetAddress: nonRevenueFacets[3],
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: revenueSelectors
        });
        diamondCutInt[7] = cut;
        // diamondCut.push(cut);

        // diamondCut = diamondCutInt;

        return diamondCutInt;
    }

}








// enum FacetCutAction {Add, Replace, Remove}
//     // Add=0, Replace=1, Remove=2

//     struct FacetCut {
//         address facetAddress;
//         FacetCutAction action;
//         bytes4[] functionSelectors;
//     }