//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/IL1_ETH_Bridge.sol';
import '../interfaces/DelayedInbox.sol';
import './OpsReady.sol';
import './Test2.sol';

import 'hardhat/console.sol'; 




contract PayMeFacetHop is OpsReady { 

    IL1_ETH_Bridge hop; 

    uint chainId; 

    address public constant nullAddr = 0x0000000000000000000000000000000000000000;
    address public owner;
    address public manager;

    uint maxSubmissionCost;
    uint maxGas;
    uint gasPriceBid;

    DelayedInbox inbox;

    event ThrowTicket(uint ticketID);


    constructor(
        address _owner, 
        address _opsGel,
        uint _chainId,
        address _hop,
        address _manager,
        address _inbox,
        uint _maxSubmissionCost,
        uint _maxGas,
        uint _gasPriceBid
    ) OpsReady(_opsGel) {
        owner = _owner;
        chainId = _chainId;
        hop = IL1_ETH_Bridge(_hop);
        manager = _manager;
        inbox = DelayedInbox(_inbox);

        maxSubmissionCost = _maxSubmissionCost;
        maxGas = _maxGas;
        gasPriceBid = _gasPriceBid;

    }

    receive() external payable {}


    // *** HOP PART ***** 

    function sendToArb(address _userToken, uint _callvalue) external payable { // put the modifier OnlyOps and exchange msg.value for address(this).balance

        bytes memory data = abi.encodeWithSelector(
            Test2(payable(manager)).exchangeToUserToken.selector, 
            owner, _userToken
        );
        
        //user ticketID later on to check the sequencer's inbox for unconfirmed txs
        uint ticketID = inbox.createRetryableTicket{value: msg.value}(
            manager, 
            msg.value - _callvalue, 
            maxSubmissionCost, 
            manager, 
            manager, 
            maxGas, 
            gasPriceBid, 
            data
        );

        emit ThrowTicket(ticketID);
        
    }

    // *** GELATO PART ******

    function startTask(address _userToken, uint _callvalue) external returns(bytes32 taskId) {
        (taskId) = opsGel.createTaskNoPrepayment(
            address(this),
            this.sendToArb.selector,
            address(this),
            abi.encodeWithSelector(this.checker.selector, _userToken, _callvalue),
            ETH
        );
    }

    function checker(address _userToken, uint _callvalue) external view returns(bool canExec, bytes memory execPayload) {
        if (address(this).balance > 0) {
            canExec = true;
        }
        execPayload = abi.encodeWithSelector(
            this.sendToArb.selector, _userToken, _callvalue
        );
    }

}



