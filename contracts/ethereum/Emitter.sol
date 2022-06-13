//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14; 


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/access/Ownable.sol';
import './StorageBeacon.sol';
import '../Errors.sol';

import 'hardhat/console.sol';


contract Emitter is Initializable, Ownable {
    address private _beacon;

    event ShowTicket(uint indexed ticketID);


    function storeBeacon(address beacon_) external initializer {
        _beacon = beacon_;
    }

    function _getStorageBeacon() private view returns(StorageBeacon) {
        return StorageBeacon(ozUpgradeableBeacon(_beacon).storageBeacon(0));
    }

    function forwardEvent(uint ticketID_) external { 
        if (!_getStorageBeacon().proxyDatabase(msg.sender)) revert NotProxy();
        emit ShowTicket(ticketID_);
    }
}



        




