pragma solidity 0.8.14;



contract DiamondMock {

    event ThrowVar(address x);
    event ThrowVar2(address y);


    constructor(
        // IDiamondCut.FacetCut[] memory _diamondCut,
        // address _contractOwner, 
        // bytes memory _functionCall, 
        address _init,
        address[] memory nonRevenueFacets_ 
    ) payable {        
        handleInit(_init);
        // emit ThrowVar2(_init);
        emit ThrowVar(nonRevenueFacets_[0]);


        // LibDiamond.diamondCut(_diamondCut, _init, _functionCall);
        // LibDiamond.setContractOwner(_contractOwner);
        // LibDiamond.setNonRevenueFacets(nonRevenueFacets_);
    }

    function diamondMock_dont_revert2() public {
        assert(false);
    }

    function handleInit(address init2_) internal {
        emit ThrowVar2(init2_);
        assert(false);
    }


}