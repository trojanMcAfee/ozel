// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14; 


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/access/Ownable.sol';
import './StorageBeacon.sol';
import '../Errors.sol';

// import 'hardhat/console.sol';


contract Emitter is Initializable, Ownable {
    address private _beacon;

    event ShowTicket(address indexed proxy);


    function storeBeacon(address beacon_) external initializer {
        _beacon = beacon_;
    }

    function _getStorageBeacon() private view returns(StorageBeacon) {
        return StorageBeacon(ozUpgradeableBeacon(_beacon).storageBeacon(0));
    }

    function forwardEvent() external { 
        if (!_getStorageBeacon().proxyDatabase(msg.sender)) revert NotProxy();
        emit ShowTicket(msg.sender);
    }
}



        



