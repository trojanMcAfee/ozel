// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import { TradeOps } from '../arbitrum/AppStorage.sol';

// struct TradeOps {
//     int128 tokenIn;
//     int128 tokenOut;
//     address baseToken;
//     address userToken;  
//     address pool;
// }


library LibCommon {

    function remove(address[] storage tokensDB_, address toRemove_) external {
        uint index;
        for (uint i=0; i < tokensDB_.length; i++) {
            if (tokensDB_[i] == toRemove_)  {
                index = i;
                break;
            }
        }
        for (uint i=index; i < tokensDB_.length - 1;){
            tokensDB_[i] = tokensDB_[i+1];
            unchecked { ++i; }
        }
        delete tokensDB_[tokensDB_.length-1];
        tokensDB_.pop();
    }

    function remove(
        TradeOps[] storage swaps_, 
        TradeOps memory swapToRemove_
    ) external {
        uint index;
        for (uint i=0; i < swaps_.length; i++) {
            if (swaps_[i].userToken == swapToRemove_.userToken)  {
                index = i;
                break;
            }
        }
        for (uint i=index; i < swaps_.length - 1;){
            swaps_[i] = swaps_[i+1];
            unchecked { ++i; }
        }
        delete swaps_[swaps_.length-1];
        swaps_.pop();
    }
}