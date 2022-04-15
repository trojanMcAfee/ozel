//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/IL1_ETH_Bridge.sol';
import '../interfaces/DelayedInbox.sol';
import './OpsReady.sol';
import './Test2.sol';

import 'hardhat/console.sol'; 




contract PayMeFacetHop is OpsReady { 

    uint chainId; 

    address public constant nullAddr = 0x0000000000000000000000000000000000000000;
    address public owner;
    address public PYY;

    uint maxSubmissionCost;
    uint maxGas;
    uint gasPriceBid;

    DelayedInbox inbox;

    event ThrowTicket(uint ticketID);


    constructor(
        address _owner, 
        address _opsGel,
        uint _chainId,
        address _pyy,
        address _inbox,
        uint _maxSubmissionCost,
        uint _maxGas,
        uint _gasPriceBid
    ) OpsReady(_opsGel) {
        owner = _owner;
        chainId = _chainId;
        PYY = _pyy;
        inbox = DelayedInbox(_inbox);
        maxSubmissionCost = _maxSubmissionCost;
        maxGas = _maxGas;
        gasPriceBid = _gasPriceBid;
    }

    receive() external payable {}



    function sendToArb(address userToken_, uint callvalue_) external onlyOps { 
        (uint fee, ) = opsGel.getFeeDetails();
        _transfer(fee, ETH);

        // --- deposits to PYY (ex-Manager) ----
        bytes memory data = abi.encodeWithSelector(
            Test2(payable(PYY)).exchangeToUserToken.selector, 
            owner, userToken_
        );

        // user ticketID later on to check the sequencer's inbox for unconfirmed txs
        uint ticketID = inbox.createRetryableTicket{value: address(this).balance}(
            PYY, 
            address(this).balance - callvalue_, 
            maxSubmissionCost, 
            PYY, 
            PYY, 
            maxGas, 
            gasPriceBid, 
            data
        );

        emit ThrowTicket(ticketID);
    }

    // *** GELATO PART ******

    function startTask(address userToken_, uint callvalue_) external returns(bytes32 taskId) {
        (taskId) = opsGel.createTaskNoPrepayment(
            address(this),
            this.sendToArb.selector,
            address(this),
            abi.encodeWithSelector(this.checker.selector, userToken_, callvalue_),
            ETH
        );
    }

    function checker(
        address userToken_, 
        uint callvalue_
    ) external view returns(bool canExec, bytes memory execPayload) {
        if (address(this).balance > 0) {
            canExec = true;
        }
        execPayload = abi.encodeWithSelector(
            this.sendToArb.selector, userToken_, callvalue_
        );
    }

}



