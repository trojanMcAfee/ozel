//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import './StorageBeaconMock.sol';
import './ozUpgradeableBeacon.sol';

import 'hardhat/console.sol';


contract ImplementationMock {


    uint variable;
    address beacon;

    constructor(address beacon_) {
        beacon = beacon_;
    }


    function _getStorageBeacon() private view returns(StorageBeaconMock) { 
        return StorageBeaconMock(ozUpgradeableBeacon(beacon).storageBeacon(1));
    }


    function setVar() public {
        variable = _getStorageBeacon().x();
        console.log('variable: ^^^^', variable);

    }



}