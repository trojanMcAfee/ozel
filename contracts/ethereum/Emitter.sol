//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14; 


import 'hardhat/console.sol';


contract Emitter {

    event showTicket(uint ticketID);

    function forwardEvent(uint ticketID_) external { //put a role
        console.log('msg.sender in emitter *****: ', msg.sender);
        emit showTicket(ticketID_);
    }
}


