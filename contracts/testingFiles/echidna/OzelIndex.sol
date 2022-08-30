// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


// struct TradeOps {
//     int128 tokenIn;
//     int128 tokenOut;
//     address baseToken;
//     address userToken;  
//     address pool;
// }


// import '../arbitrum/ExecutorFacetTest.sol';
// import '../arbitrum/OZLFacetTest.sol';
// import '../../Errors.sol';
import './TestEch.sol';

// import '../../arbitrum/Diamond.sol';
// import { IDiamondCut } from "../../../interfaces/IDiamondCut.sol";



// contract ExchangeUserToken_Echidna is Diamond {

//     enum FacetCutAction {Add, Replace, Remove}
//     // Add=0, Replace=1, Remove=2

//     struct FacetCut {
//         address facetAddress;
//         FacetCutAction action;
//         bytes4[] functionSelectors;
//     }

//     //an array of this with all facets and selectors

//     IDiamondCut.FacetCut[] diamondCut = _setDiamondCut();


//     constructor() Diamond(
//         diamondCut
//     ) {

//     }


//     function _setDiamondCut() private returns(IDiamondCut.FacetCut[] storage) {

//     }


// }

contract ExchangeUserToken_Echidna is TestEch { //is OZLFacetTest 

    event AssertionFailed(uint);

    // struct UserConfig { 
    //     address user;
    //     address userToken;
    //     uint userSlippage; 
    // }

    // modifier filterDetails(UserConfig calldata userDetails_) {
    //     if (userDetails_.user == address(0) || userDetails_.userToken == address(0)) revert CantBeZero('address'); 
    //     if (userDetails_.userSlippage <= 0) revert CantBeZero('slippage');
    //     _;
    // }

    // function exchangeUserToken_never_reverts2(
    //     UserConfig memory userDetails_
    // ) public filterDetails(userDetails_) {
    //     assert(false);
    // }

    // constructor(
    //     IDiamondCut.FacetCut[] memory _diamondCut, 
    //     address _contractOwner, 
    //     bytes memory _functionCall, 
    //     address _init,
    //     address[] memory nonRevenueFacets_
    // ) Diamond(
    //     _diamondCut, 
    //     _contractOwner, 
    //      _functionCall, 
    //     _init,
    //     nonRevenueFacets_
    // ) {}

    uint num3 = setNum();

    constructor() TestEch(num3) {}


    function exchangeUserToken_never_reverts2(uint num_) public {
        (bool success, ) = address(this).call(
            abi.encodeWithSignature('testing(uint256)', num_)
        );
        require(success);
    }

    function setNum() internal returns(uint) {
        return 23;
    }


    // function exchangeUserToken_never_reverts(
    //     UserConfig calldata userDetails_
    // ) public { //filterDetails(userDetails_)
    //     // if (userDetails_.userToken == address(0x0)) revert NotEnabled();
    //     assert(false);

    //     (bool success, ) = address(this).call(
    //         abi.encodeWithSignature(
    //             'exchangeToUserToken((address,address,uint256))', 
    //             userDetails_
    //         )
    //     );
    //     assert(success);
    // }

}




// contract Diamond_ech is Diamond {

//     function echidna_never_reverts() public view returns(bool) {

//     }

//     // function test_diamond(
//     //     UserConfig calldata userDetails_
//     // ) public {

//     //     (bool success, ) = 

//     // }

// }



