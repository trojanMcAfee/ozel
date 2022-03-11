//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/IL1_ETH_Bridge.sol';
import '../interfaces/DelayedInbox.sol';
import './OpsReady.sol';

import 'hardhat/console.sol';




contract PayMeFacetHop is OpsReady { 

    IL1_ETH_Bridge hop; 

    uint chainId; 

    address public constant nullAddr = 0x0000000000000000000000000000000000000000;
    address public immutable owner;
    address public immutable manager;

    //*** Hard coded values in constructor. Should be dynamically created by querying L2 (check Greeter Arb exer) */
    uint maxSubmissionCost;
    uint maxGas;
    uint gasPriceBid;
    //***************** */

    DelayedInbox inbox;

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

    // function sendToArb() external onlyOps { 
    //     hop.sendToL2{value: address(this).balance}(
    //         chainId, manager, address(this).balance, 0, 0, nullAddr, 0
    //     );
    // }

    function sendToArb(address _userToken) external payable returns(uint ticketID) { // put the modifier OnlyOps and exchange msg.value for address(this).balance
        // hop.sendToL2{value: msg.value}( 
        //     chainId, manager, msg.value, 0, 0, nullAddr, 0
        // );


        //send a cross-chain message to arbitrum here 
        // msg.value, owner, _userToken        
        bytes memory data = abi.encodeWithSignature(
            'exchangeToUserToken(address,address)', 
            owner, _userToken
        );

        //user ticketID later on to check the sequencer's inbox for unconfirmed txs
        ticketID = inbox.createRetryableTicket{value: msg.value}(
            manager, 
            0, 
            maxSubmissionCost, 
            manager, 
            manager, 
            maxGas, 
            gasPriceBid, 
            data
        );

        
        
    }

    // *** GELATO PART ******

    function startTask(address _userToken) external returns(bytes32 taskId) {
        (taskId) = opsGel.createTaskNoPrepayment(
            address(this),
            this.sendToArb.selector,
            address(this),
            abi.encodeWithSelector(this.checker.selector, _userToken),
            ETH
        );
    }

    function checker(address _userToken) external view returns(bool canExec, bytes memory execPayload) {
        if (address(this).balance > 0) {
            canExec = true;
        }
        execPayload = abi.encodeWithSelector(this.sendToArb.selector, _userToken);
    }

}



