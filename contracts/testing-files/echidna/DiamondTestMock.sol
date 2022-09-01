pragma solidity 0.8.14;


import './DiamondMock.sol';

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


contract DiamondTestMock is DiamondMock {

    constructor() DiamondMock(
        setInit(),
        setNonRevenueFacets()
    ) {}


    function setNonRevenueFacets() public returns(address[] memory facets) { 
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

    function setInit() public returns(address) { 
        DiamondInit initContract = new DiamondInit();
        return address(initContract);
    }



}