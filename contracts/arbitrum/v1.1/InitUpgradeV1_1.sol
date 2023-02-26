// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../AppStorage.sol';

/**
 * @notice Initializes the storage for the v1.1 upgrade
 */
contract InitUpgradeV1_1 {

    AppStorage s;

    function init(bytes4[] calldata selectors_) external {
        for (uint i=0; i < selectors_.length;) {
            s.authorizedSelectors[selectors_[i]] = true;
            unchecked { ++i; }
        }
    }
}