//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;




contract StorageBeaconMock {
    uint public extraVar = 11;

    function getExtraVar() external view returns(uint) {
        return extraVar;
    }
}