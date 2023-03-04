// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../AppStorage.sol';

/**
 * @notice Initializes the storage for the v1.2 upgrade
 */
contract InitUpgradeV1_2 {

    AppStorage s;

    /// @dev Adds all the supported tokens to the database array
    function init(address[] calldata tokens_) external {
        uint length = tokens_.length;
        for (uint i=0; i < length;) {
            s.tokenDatabaseArray.push(tokens_[i]);
            unchecked { ++i; }
        }
    }
}