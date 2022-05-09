//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/DelayedInbox.sol';
import './PayMeFacetHop.sol';



contract StorageBridge {

    PayMeFacetHop payme;
    address beacon;

    address opsGel;
    address PYY;
    address emitter;
    
    uint maxSubmissionCost;
    uint maxGas;
    uint gasPriceBid;
    uint autoRedeem;

    DelayedInbox inbox;


    constructor( 
        address payme_, 
        address beacon_,
        address _opsGel,
        address _pyy,
        address _inbox,
        uint _maxSubmissionCost,
        uint _maxGas,
        uint _gasPriceBid,
        address emitter_,
        uint autoRedeem_
    )  { 
        payme = PayMeFacetHop(payable(payme_));
        beacon = beacon_;

        opsGel = _opsGel;
        PYY = _pyy;
        inbox = DelayedInbox(_inbox);
        maxSubmissionCost = _maxSubmissionCost; 
        maxGas = _maxGas; 
        gasPriceBid = _gasPriceBid;
        emitter = emitter_;
        autoRedeem = autoRedeem_;
    }
  

}




