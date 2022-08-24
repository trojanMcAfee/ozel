// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


// struct TradeOps {
//     int128 tokenIn;
//     int128 tokenOut;
//     address baseToken;
//     address userToken;  
//     address pool;
// }

// interface IExecutorFacet {
//     function calculateSlippage(uint amount_, uint basisPoint_) public pure returns(uint minAmountOut); 
//     function executeFinalTrade( 
//         TradeOps calldata swapDetails_, 
//         uint userSlippage_,
//         address user_,
//         uint lockNum_
//     ) external payable;
//     function updateExecutorState(
//         uint amount_, 
//         address user_,
//         uint lockNum_
//     ) external payable;
//     function modifyPaymentsAndVolumeExternally(
//         address user_, 
//         uint newAmount_,
//         uint lockNum_
//     ) external;
//     function transferUserAllocation( 
//         address sender_, 
//         address receiver_, 
//         uint amount_, 
//         uint senderBalance_,
//         uint lockNum_
//     ) external;
// }


import '../arbitrum/ExecutorFacetTest.sol';


contract OzelIndex is ExecutorFacetTest {

    // IExecutorFacet executor;

    // constructor() {
    //     executor = IExecutorFacet(...);
    // }

    constructor() {}


    function executeFinalTrade_never_reverts(
        TradeOps calldata swapDetails_, 
        uint userSlippage_,
        address user_,
        uint lockNum_
    ) public {
        (bool success, ) = address(this).call(
            abi.encodeWithSelector(
                this.executeFinalTrade.selector,
                swapDetails_, userSlippage_, user_, lockNum_
            )
        );
        assert(success);
    }

    // function echidna_checkk() public view returns(bool) {
    //     return false;
    // }
    



}