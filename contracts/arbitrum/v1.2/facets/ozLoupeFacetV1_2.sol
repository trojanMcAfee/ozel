// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../../AppStorage.sol';


contract ozLoupeFacetV1_2 {

    AppStorage s;

    /// @dev Returns all the tokens in the database
    function getTokenDatabase() external view returns(address[] memory) {
        return s.tokenDatabaseArray;
    }
}