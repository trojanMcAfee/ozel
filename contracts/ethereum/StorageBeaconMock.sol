//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import 'hardhat/console.sol';


contract StorageBeaconMock {

    uint public x = 11;

    fallback(bytes calldata) external returns(bytes memory) { 

        console.log('***************');
        console.logBytes(msg.data);

    }


}