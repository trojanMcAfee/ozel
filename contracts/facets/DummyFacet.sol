//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import {LibDiamond} from "../libraries/LibDiamond.sol";

import 'hardhat/console.sol';

import '../AppStorage.sol';

contract DummyFacet {
    // AppStorage internal s;

    function getHello() public view {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        console.log('address ETH: ', ds.ETH);
        //neither diamondStorage() nor AppStorage is working
    }


}