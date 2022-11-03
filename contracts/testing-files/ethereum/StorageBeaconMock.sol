// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


contract StorageBeaconMock {
    uint public extraVar = 11;

    function getExtraVar() external view returns(uint) {
        return extraVar;
    }
}