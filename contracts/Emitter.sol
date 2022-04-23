//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


contract Emitter {

    event showTicket(uint ticketID);

    function forwardEvent(uint ticketID_) external {
        emit showTicket(ticketID_);
    }
}