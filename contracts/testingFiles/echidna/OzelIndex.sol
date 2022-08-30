// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


// struct TradeOps {
//     int128 tokenIn;
//     int128 tokenOut;
//     address baseToken;
//     address userToken;  
//     address pool;
// }


import '../arbitrum/ExecutorFacetTest.sol';
import '../arbitrum/OZLFacetTest.sol';
// import '../../Errors.sol';
import './TestEch.sol';


// contract OzelIndex is ExecutorFacetTest {

//     modifier filterParams(
//         TradeOps calldata swapDetails_, 
//         uint userSlippage_,
//         address user_,
//         uint lockNum_
//     ) {
//     //   require(
//     //     swapDetails_.tokenIn >= int(0) && swapDetails_.tokenIn <= int(2) ||
//     //     swapDetails_.tokenOut >= int(0) && swapDetails_.tokenOut <= int(2)
//     //   ); 
//     //   require(swapDetails_.baseToken != address(0x0)); 
//     //   require(swapDetails_.userToken != address(0x0));   
//     //   require(swapDetails_.pool != address(0x0)); 
//     //   //------
//       require(userSlippage_ != 0);
//       require(user_ != address(0x0));
//       require(lockNum_ != 0);
//       //------
//         uint length = s.swaps.length;
//         uint count = 0;
        
//         for (uint i=0; i < length; i++) {
//             TradeOps storage config = s.swaps[i];
//             bool success = false;

//             if (swapDetails_.tokenIn == config.tokenIn) count++;
//             if (swapDetails_.tokenOut == config.tokenOut) count++;
//             if (swapDetails_.baseToken == config.baseToken) count++;
//             if (swapDetails_.userToken == config.userToken) count++;
//             if (swapDetails_.pool == config.pool) count++;
//             if (count == 5) success = true;
//             if (i == length - 1) require(success);
//         }

//     // uint ranNum = getRandomNumber();

//     // s.swaps[ranNum]

//     // for (uint i=0; i < s.swaps.length; i++) {
//     //     swapDetails_. == s.swaps[i]
//     // }

//       _;
//     }


//     // modifier filterParams2(
//     //     TradeOps calldata swapDetails_, 
//     //     uint userSlippage_,
//     //     address user_,
//     //     uint lockNum_
//     // ) {
//     //     bool flag = false;
//     //     for (uint i=0; i < s.swaps.length; i++) {
//     //         TradeOps storage config = s.swaps[i];
//     //         config.tokenIn

//     //         if (swapDetails_ == s.swaps[i]) {
//     //             flag = true;
//     //         }
//     //     }
//     //     require(flag);
//     // }



//     function executeFinalTrade_never_reverts(
//         TradeOps calldata swapDetails_, 
//         uint userSlippage_,
//         address user_,
//         uint lockNum_
//     ) public filterParams(
//         swapDetails_, 
//         userSlippage_,
//         user_,
//         lockNum_
//     ) {

//         (bool success, ) = address(this).call(
//             abi.encodeWithSelector(
//                 this.executeFinalTrade.selector,
//                 swapDetails_, userSlippage_, user_, lockNum_
//             )
//         );
//         assert(success);
//     }

//     // function check_revert(uint num_) public {
//     //     if (num_ > 345346356467453456456435435645634563432) {
//     //         assert(false);
//     //     } else {
//     //         assert(true);
//     //     }
//     // }


// }

contract ExchangeUserToken_Echidna is OZLFacetTest { //is OZLFacetTest 

    event AssertionFailed(uint);

    // struct UserConfig { 
    //     address user;
    //     address userToken;
    //     uint userSlippage; 
    // }

    modifier filterDetails(UserConfig calldata userDetails_) {
        if (userDetails_.user == address(0) || userDetails_.userToken == address(0)) revert CantBeZero('address'); 
        if (userDetails_.userSlippage <= 0) revert CantBeZero('slippage');
        _;
    }

    function exchangeUserToken_never_reverts2(
        UserConfig memory userDetails_
    ) public filterDetails(userDetails_) {
        assert(false);
    }


    // function exchangeUserToken_never_reverts(
    //     UserConfig calldata userDetails_
    // ) public filterDetails(userDetails_) { //filterDetails(userDetails_)
    //     // if (userDetails_.userToken == address(0x0)) revert NotEnabled();
    //     assert(false);
    //     // emit AssertionFailed(23);

    //     // (bool success, ) = address(this).call(
    //     //     abi.encodeWithSelector(
    //     //         this.exchangeToUserToken.selector, 
    //     //         userDetails_
    //     //     )
    //     // );
    //     // assert(success);
    // }

}




