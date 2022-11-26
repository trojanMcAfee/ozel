// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../Errors.sol';

/// @author Inspired on Solmate (https://github.com/Rari-Capital/solmate/blob/main/src/utils/ReentrancyGuard.sol)
abstract contract ozReentrancyGuard {
    uint private locked = 1;
    uint private locked2 = 1;

    modifier nonReentrant() {
        if (!(locked == 1)) revert Reentering();

        locked = 2;

        _;

        locked = 1;
    }

    modifier nonReentrant2() {
        if (!(locked == 1)) revert Reentering();

        locked2 = 2;

        _;

        locked2 = 1;
    }
}