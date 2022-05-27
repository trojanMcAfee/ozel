//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14; 


import '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol';
import '@rari-capital/solmate/src/auth/authorities/RolesAuthority.sol';


contract ozUpgradeableBeacon is UpgradeableBeacon {
    address private _storageBeacon;

    RolesAuthority auth;

    event UpgradedStorageBeacon(address indexed newStorageBeacon);
    event NewAuthority(address indexed newAuthority);


    constructor(address impl_, address storageBeacon_) UpgradeableBeacon(impl_) {
        _storageBeacon = storageBeacon_;
    }


    function storageBeacon() external view returns(address) {
        return _storageBeacon;
    }

    function upgradeStorageBeacon(address newStorageBeacon_) external onlyOwner {
        _storageBeacon = newStorageBeacon_;
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

