//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14; 


import './StorageBeacon.sol';
import './Errors.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

import 'hardhat/console.sol';


contract Emitter is Ownable {
    StorageBeacon storageBeacon;

    event showTicket(uint ticketID);

    function storeStorageBeacon(address storageBeacon_) external onlyOwner {
        storageBeacon = StorageBeacon(storageBeacon_);
    }

    function forwardEvent(uint ticketID_) external { 
        if (!storageBeacon.proxyDatabase(msg.sender)) revert NotProxy();
        emit showTicket(ticketID_);
    }
}


