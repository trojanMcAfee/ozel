// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../AppStorage.sol';


contract InitUpgradeV1_2 {

    AppStorage s;

    //do the methods to add and remove tokens from tokensDatabaseArray, prob in new ozCutFacet or OZLFacet

    function init(address[] calldata tokens_) external {
        uint length = tokens_.length;
        for (uint i=0; i < length;) {
            s.tokenDatabaseArray.push(tokens_[i]);
            unchecked { ++i; }
        }
    }
}