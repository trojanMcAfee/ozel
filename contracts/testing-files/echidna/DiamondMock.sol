pragma solidity 0.8.14;


import { IDiamondCut } from "../../interfaces/IDiamondCut.sol";
import './LibDiamondMock.sol';
import './InitMock.sol';


contract DiamondMock {

    event ThrowVar(address x);
    event ThrowVar2(address y, address z, IDiamondCut.FacetCut[] k);


    constructor(
        IDiamondCut.FacetCut[] memory _diamondCut,
        address _contractOwner, 
        bytes memory _functionCall, 
        address _init,
        address[] memory nonRevenueFacets_ 
    ) payable {        
        LibDiamondMock.diamondCut(_diamondCut, _init, _functionCall);
        LibDiamondMock.setContractOwner(_contractOwner);
        LibDiamondMock.setNonRevenueFacets(nonRevenueFacets_);


        // handleInit(_init, _contractOwner, _diamondCut);
        // emit ThrowVar(nonRevenueFacets_[0]);
    }

    function diamondMock_dont_revert2() public {
        assert(true);
    }

    // function test_initMock(uint num_) public {
    //     InitMock init = new InitMock();
    //     init.doMath(num_);
    // }

    // function handleInit(
    //     address init2_, 
    //     address owner_,
    //     IDiamondCut.FacetCut[] memory diamondCut_
    // ) internal {
    //     emit ThrowVar2(init2_, owner_, diamondCut_);
    //     if (init2_ != owner_) assert(true);
    // }


}