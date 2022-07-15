// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import { LibDiamond } from "../libraries/LibDiamond.sol";
import { IDiamondCut } from "../interfaces/IDiamondCut.sol";
import { IDiamondLoupe } from "../interfaces/IDiamondLoupe.sol";
import { IERC173 } from "../interfaces/IERC173.sol";
import './AppStorage.sol';

import 'hardhat/console.sol';

import '../interfaces/IYtri.sol';
import {ITri} from '../interfaces/ICurve.sol';



contract Diamond { 

    AppStorage s;


    constructor(
        IDiamondCut.FacetCut[] memory _diamondCut, 
        address _contractOwner, 
        bytes memory _functionCall, 
        address _init
    ) payable {        
        LibDiamond.diamondCut(_diamondCut, _init, _functionCall);
        LibDiamond.setContractOwner(_contractOwner);
    }


    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable { 
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        // get diamond storage
        assembly {
            ds.slot := position
        }
        // get facet from function selector
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "Diamond: Function does not exist");
        // Execute external function from facet using delegatecall and return any value.
        assembly {
            // copy function selector and any arguments
            calldatacopy(0, 0, calldatasize())
            // execute function call using the facet
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            // get any return value
            returndatacopy(0, 0, returndatasize())
            // return any return value or error back to the caller
            switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }

    receive() external payable {}

    // function changeKaChing$$$() {}

    //WETH: 2, USDT: 0
    function kaChing$$$() external returns(uint) {
        uint denominator;
        uint yBalanceToWithdraw;
        
        (,int price,,,) = s.priceFeed.latestRoundData();

        uint yBalance = IYtri(s.yTriPool).balanceOf(address(this));
        uint priceShare = IYtri(s.yTriPool).pricePerShare();
        uint balanceCrv3 = (yBalance * priceShare) / 1 ether;

        uint balanceWETH = ITri(s.tricrypto).calc_withdraw_one_coin(balanceCrv3, 2);
        uint valueUM = balanceWETH * (uint(price) / 10 ** 8);

        if (valueUM >= 10000000 * 1 ether) {
            denominator = 5;

            uint x = ITri(s.tricrypto).balanceOf(address(this));
            console.log('tri bal pre: ', x);

            yBalanceToWithdraw = yBalance / denominator;
            IYtri(s.yTriPool).withdraw(yBalanceToWithdraw);

            x = ITri(s.tricrypto).balanceOf(address(this));
            console.log('tri bal pre: ', x);

            //check if yTri bal is the same as that of tri when withdrawing (in OZL facet seems like it is)

            // swapRouter


        }


        return balanceWETH;
        

    }

}



// struct EmergencyMode {
//         ISwapRouter swapRouter;
//         AggregatorV3Interface priceFeed; 
//         uint24 poolFee;
//         address tokenIn;
//         address tokenOut; 
//     }


//     function _calculateMinOut(
//         StorageBeacon.EmergencyMode memory eMode_, 
//         uint i_
//     ) private view returns(uint minOut) {
        // (,int price,,,) = eMode_.priceFeed.latestRoundData();
//         uint expectedOut = address(this).balance.mulDivDown(uint(price) * 10 ** 10, 1 ether);
//         uint minOutUnprocessed = 
//             expectedOut - expectedOut.mulDivDown(userDetails.userSlippage * i_ * 100, 1000000); 
//         minOut = minOutUnprocessed.mulWadDown(10 ** 6);
//     }
