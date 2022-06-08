//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import 'hardhat/console.sol';


contract StorageBeaconMock {

    uint public x = 11;

    fallback(bytes calldata) external returns(bytes memory) { 
        address storageBeacon = 0x9BcC604D4381C5b0Ad12Ff3Bf32bEdE063416BC7;

        console.log('***************');
        console.logBytes(msg.data);

        (bool success, bytes memory data) = storageBeacon.call(msg.data);
        require(success, 'failed on sBeacon mock');

        return data;

    }


}