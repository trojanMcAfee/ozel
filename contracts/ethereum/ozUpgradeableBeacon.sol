//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol';


contract ozUpgradeableBeacon is UpgradeableBeacon {
    address _implementation;

    address private _storageBeacon;

    event UpgradedStorageBeacon(address indexed newStorageBeacon);


    constructor(address impl_, address storageBeacon_) UpgradeableBeacon(impl_) {
        _storageBeacon = storageBeacon_;
    }


    function storageBeacon() public view returns(address) {
        return _storageBeacon;
    }

    function upgradeStorageBeacon(address newStorageBeacon_) external onlyOwner {
        _storageBeacon = newStorageBeacon_;
        emit UpgradedStorageBeacon(newStorageBeacon_);
    }


}