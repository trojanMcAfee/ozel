//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import './StorageBeaconMock.sol';
import './ozUpgradeableBeacon.sol';

import 'hardhat/console.sol';


contract ImplementationMock2 {


    uint variable;
    address beacon;

    constructor(address beacon_) {
        beacon = beacon_;
    }


    function _getStorageBeacon() private view returns(StorageBeaconMock) { 
        return StorageBeaconMock(ozUpgradeableBeacon(beacon).storageBeacon(1));
    }


    function setVar() public {
        bytes memory data = abi.encodeWithSignature('getHello()');
        (bool success, bytes memory returnData) = address(_getStorageBeacon()).call(data);
        require(success, 'failed on impl mock 2');

        console.log('returnData:');
        console.logBytes(returnData);



        // variable = _getStorageBeacon().getHello2();
        // console.log('variable: ^^^^', variable);

    }



}