// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../../arbitrum/Diamond.sol';
import { IDiamondCut } from "../../interfaces/IDiamondCut.sol";
import '../../arbitrum/upgradeInitializers/DiamondInit.sol';

import '../../arbitrum/facets/DiamondCutFacet.sol';
import '../../arbitrum/facets/DiamondLoupeFacet.sol';
import '../arbitrum/ExecutorFacetTest.sol';
import '../../arbitrum/facets/OwnershipFacet.sol';
import '../arbitrum/OZLFacetTest.sol';
import '../arbitrum/RevenueFacetTest.sol';
import '../../arbitrum/facets/oz20Facet.sol';
import '../../arbitrum/facets/oz4626Facet.sol';


// import 'hardhat/console.sol';


contract DiamondTest is Diamond {

    address owner = address(this); //0x00000000000000000000000000000000DeaDBeef
    address[] nonRevenueFacets;

    //Hardcoded from 'functionCall' const from helpers-arb.js for simplicity
    bytes functionCall = hex'c126953d000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000002c000000000000000000000000000000000000000000000000000000000000003c000000000000000000000000000000000000000000000000000000000000004a00000000000000000000000000000000000000000000000000000000000000520000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000002279b7a0a67db372996a5fab50d91eaa73d2ebe6000000000000000000000000960ea3e3c7fb317332d990873d354e18d76455900000000000000000000000008e0b8c8bb9db49a46697f3a5bb8a308e744821d20000000000000000000000003e01dd8a5e1fb3481f0f589056b428fc308af0fb00000000000000000000000030df229cefa463e991e29d42db0bae2e122b2ac70000000000000000000000007f90122bf0700f9e7e1f688fe926940e8839f353000000000000000000000000239e14a19dff93a17339dcc444f74406c17f8e67000000000000000000000000f07d553b195080f84f582e88ecdd54baa122b2790000000000000000000000008a791620dd6260079bf849dc5567adc3f2fdc318000000000000000000000000610178da211fef7d417bc0e6fed39f05609ad788000000000000000000000000b7f8bc63bbcad18155201308c8f3540b07f84f5e000000000000000000000000639fe6ab55c921f74e7fac1ee960c0b6293ba612000000000000000000000000e592427a0aece92de3edee1f18e0157c058615640000000000000000000000000dcd1bf9a1b36ce34237eeafef220932846bcd820000000000000000000000000000000000000000000000000000000000000007000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb90000000000000000000000002f2a2543b76a4166549f7aab2e75bef0aefc5b0f000000000000000000000000dbf31df14b66535af65aac99c32e9ea844e14501000000000000000000000000ff970a61a04b1ca14834a43f5de4533ebddb5cc8000000000000000000000000fea7a6a0b346362bf88a9e4a88416b77a57d6c2a00000000000000000000000082af49447d8a07e3bd95bd0d56f35241523fbab100000000000000000000000017fc002b466eec40dae837fc4be5c67993ddbd6f0000000000000000000000000000000000000000000000000000000000000006000000000000000000000000fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9000000000000000000000000ff970a61a04b1ca14834a43f5de4533ebddb5cc800000000000000000000000017fc002b466eec40dae837fc4be5c67993ddbd6f0000000000000000000000002f2a2543b76a4166549f7aab2e75bef0aefc5b0f000000000000000000000000fea7a6a0b346362bf88a9e4a88416b77a57d6c2a000000000000000000000000dbf31df14b66535af65aac99c32e9ea844e145010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000001f400000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000044f7a656c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000034f5a4c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000700000000000000000000000000000000000000000000000000000000009896800000000000000000000000000000000000000000000000000000000002faf0800000000000000000000000000000000000000000000000000000000005f5e100000000000000000000000000000000000000000000000000000000001dcd6500000000000000000000000000000000000000000000000000000000003b9aca00000000000000000000000000000000000000000000000000000000012a05f20000000000000000000000000000000000000000000000000000000002540be400';

    constructor() Diamond(
        setDiamondCut(),
        owner,
        functionCall,
        setInit(),
        nonRevenueFacets
    ) {}



    function setNonRevenueFacets() public returns(address[] memory facets) { 
        facets = new address[](4);

        DiamondCutFacet diamondCutF = new DiamondCutFacet();
        facets[0] = address(diamondCutF);
        OwnershipFacet ownershipF = new OwnershipFacet();
        facets[2] = address(ownershipF);
        RevenueFacetTest revenueTestF = new RevenueFacetTest();
        facets[3] = address(revenueTestF);
        DiamondLoupeFacet diamondLoupeF = new DiamondLoupeFacet();
        facets[1] = address(diamondLoupeF);
    }

    function setInit() public returns(address) { 
        DiamondInit initContract = new DiamondInit();
        return address(initContract);
    }

    
    function setDiamondCut() public returns(IDiamondCut.FacetCut[] memory diamondCutInt) {
        diamondCutInt = new IDiamondCut.FacetCut[](8);
        IDiamondCut.FacetCut memory cut;

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
        diamondCutInt[0] = cut;

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
        diamondCutInt[1] = cut;

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
        diamondCutInt[2] = cut;

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
        diamondCutInt[3] = cut;

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
        diamondCutInt[4] = cut;    

        bytes4[] memory ownershipSelectors = new bytes4[](2);
        ownershipSelectors[0] = OwnershipFacet(nonRevenueFacets[2]).transferOwnership.selector;
        ownershipSelectors[1] = OwnershipFacet(nonRevenueFacets[2]).owner.selector;
        cut = IDiamondCut.FacetCut({
            facetAddress: nonRevenueFacets[2],
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: ownershipSelectors
        });
        diamondCutInt[5] = cut;

        bytes4[] memory revenueSelectors = new bytes4[](1);
        revenueSelectors[0] = RevenueFacetTest(nonRevenueFacets[3]).checkForRevenue.selector;
        cut = IDiamondCut.FacetCut({
            facetAddress: nonRevenueFacets[3],
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: revenueSelectors
        });
        diamondCutInt[6] = cut;

        bytes4[] memory loupeSelectors = new bytes4[](8);
        loupeSelectors[0] = DiamondLoupeFacet(nonRevenueFacets[3]).facets.selector;
        loupeSelectors[1] = DiamondLoupeFacet(nonRevenueFacets[3]).facetFunctionSelectors.selector;
        loupeSelectors[2] = DiamondLoupeFacet(nonRevenueFacets[3]).facetAddresses.selector;
        loupeSelectors[3] = DiamondLoupeFacet(nonRevenueFacets[3]).facetAddress.selector;
        loupeSelectors[4] = DiamondLoupeFacet(nonRevenueFacets[3]).supportsInterface.selector;
        loupeSelectors[5] = DiamondLoupeFacet(nonRevenueFacets[3]).queryTokenDatabase.selector;
        loupeSelectors[6] = DiamondLoupeFacet(nonRevenueFacets[3]).getOzelIndex.selector;
        loupeSelectors[7] = DiamondLoupeFacet(nonRevenueFacets[3]).getRegulatorCounter.selector;
        cut = IDiamondCut.FacetCut({
            facetAddress: nonRevenueFacets[3],
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: loupeSelectors
        });
        diamondCutInt[7] = cut;   
    }

    //******* TESTS *******

    // function ownership_dont_revert() public {
    //     if (s.USDT == 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9) {
    //         assert(false);
    //     } else {
    //         assert(true);
    //     }

    // }

    modifier filterDetails(UserConfig calldata userDetails_) {
        require(userDetails_.user != address(0) || userDetails_.userToken != address(0)); 
        require(userDetails_.userSlippage > 0);
        require(s.tokenDatabase[userDetails_.userToken]);
        _;
    }

    function test_exchangeUserToken(
        UserConfig calldata userDetails_
    ) public filterDetails(userDetails_) {
        (bool success, ) = address(this).call(
            abi.encodeWithSignature(
                'exchangeToUserToken((address,address,uint))',
                userDetails_
            )
        );
        assert(success);
    }
}

