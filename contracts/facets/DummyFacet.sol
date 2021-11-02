//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import {LibDiamond} from "../libraries/LibDiamond.sol";
import { IERC165 } from "../interfaces/IERC165.sol";

import 'hardhat/console.sol';

import '../AppStorage.sol';

contract DummyFacet {
    AppStorage internal s;

    function getHello() public view {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        bool x = ds.supportedInterfaces[type(IERC165).interfaceId];

        console.log('num: ', s.num);
        console.log('eth: ', ds.ETH);
        console.log('owner: ', ds.contractOwner);
        console.log('in Dummy: ', x);
    }

    function getOwner() public view {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        console.log('owner: ', ds.contractOwner);
    }


}