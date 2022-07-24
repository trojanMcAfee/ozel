// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14; 


import '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol';
import '@rari-capital/solmate/src/auth/authorities/RolesAuthority.sol';



contract ozUpgradeableBeacon is UpgradeableBeacon { 
    address[] private _storageBeacons;

    RolesAuthority auth;

    event UpgradedStorageBeacon(address newStorageBeacon);
    event NewAuthority(address newAuthority);


    constructor(address impl_, address storageBeacon_) UpgradeableBeacon(impl_) {
        _storageBeacons.push(storageBeacon_);
    }


    function storageBeacon(uint version_) external view returns(address) {
        return _storageBeacons[version_];
    }

    function upgradeStorageBeacon(address newStorageBeacon_) external onlyOwner {
        _storageBeacons.push(newStorageBeacon_);
        emit UpgradedStorageBeacon(newStorageBeacon_);
    }


    //AUTH part
    function setAuth(address auth_) external onlyOwner {
        auth = RolesAuthority(auth_);
        emit NewAuthority(auth_);
    }

    function canCall( 
        address user_,
        address target_,
        bytes4 functionSig_
    ) external view returns(bool) {
        bool isAuth = auth.canCall(user_, target_, functionSig_);
        return isAuth;
    }

}

