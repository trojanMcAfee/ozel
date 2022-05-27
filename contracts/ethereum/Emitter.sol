//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14; 


import './StorageBeacon.sol';
import './Errors.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import 'hardhat/console.sol';


contract Emitter is Ownable {
    StorageBeacon storageBeacon;

    event ShowTicket(uint ticketID);
    event NewStorageBeacon(address storageBeacon);

    function storeStorageBeacon(address storageBeacon_) external onlyOwner {
        storageBeacon = StorageBeacon(storageBeacon_);
        emit NewStorageBeacon(storageBeacon_);
    }

    function forwardEvent(uint ticketID_) external { 
        if (!storageBeacon.proxyDatabase(msg.sender)) revert NotProxy();
        emit ShowTicket(ticketID_);
    }
}


