// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


// import '../../../interfaces/arbitrum/ozILoupeFacetV1_1.sol';
import '../../AppStorage.sol';


contract ozLoupeFacetV1_2 {

    AppStorage s;


    function getTokenDatabase() external view returns(address[] memory) {
        return s.tokenDatabaseArray;
    }

}