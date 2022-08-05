// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;

contract TestReturn {
    function returnZero() external pure returns(uint amountOut) {
        amountOut = 0;
    }
}