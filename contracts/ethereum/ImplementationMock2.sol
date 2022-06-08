// //SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.0;


// import './StorageBeacon.sol';
// import './StorageBeaconMock.sol';
// import './ozUpgradeableBeacon.sol';

// import 'hardhat/console.sol';


// contract ImplementationMock2 {


//     uint variable;
//     uint variable2;
//     address beacon;

//     constructor(address beacon_) {
//         beacon = beacon_;
//     }


//     function _getStorageBeacon(uint version_) private view returns(address) { 
//         return ozUpgradeableBeacon(beacon).storageBeacon(version_);
//     }


//     function setVar() public {

//         variable = StorageBeacon(_getStorageBeacon(0)).getHello();
//         variable2 = StorageBeaconMock(_getStorageBeacon(1)).getHello2();
//         console.log('variable: ^^^^', variable);
//         console.log('variable2: ', variable2);

//     }



// }