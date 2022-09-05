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






contract ExchangeUserToken_Echidna { //is OZLFacetTest 

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

    // uint num3 = setNum();

    constructor() {}


    // function exchangeUserToken_never_reverts2(uint num_) public {
    //     (bool success, ) = address(this).call(
    //         abi.encodeWithSignature('testing(uint256)', num_)
    //     );
    //     require(success);
    // }

    // function setNum() internal returns(uint) {
    //     return 23;
    // }

    function testing() public payable {
        // require(num_ == 1 ether);

        TestEch t = new TestEch();
        // t.getNum();

        (bool success, ) = address(t).delegatecall(
            abi.encodeWithSelector(t.getNum.selector)
        );
        assert(success);
    }



}








