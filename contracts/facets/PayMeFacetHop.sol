//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/IL1_ETH_Bridge.sol';
import '../interfaces/DelayedInbox.sol';
import './OpsReady.sol';
import './Test2.sol';

import 'hardhat/console.sol'; 




contract PayMeFacetHop is OpsReady { 

    struct userConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }

    userConfig userDetails; 

    uint chainId; 

    address public PYY;

    uint maxSubmissionCost;
    uint maxGas;
    uint gasPriceBid;

    DelayedInbox inbox;

    event ThrowTicket(uint ticketID);


    constructor(
        address _opsGel,
        uint _chainId,
        address _pyy,
        address _inbox,
        uint _maxSubmissionCost,
        uint _maxGas,
        uint _gasPriceBid,
        address user_,
        address userToken_,
        uint userSlippage_
    ) OpsReady(_opsGel) { 
        chainId = _chainId;
        PYY = _pyy;
        inbox = DelayedInbox(_inbox);
        maxSubmissionCost = _maxSubmissionCost;
        maxGas = _maxGas;
        gasPriceBid = _gasPriceBid;

        userDetails = userConfig({
            user: user_,
            userToken: userToken_,
            userSlippage: userSlippage_
        });
    }

    receive() external payable {}



    function sendToArb(uint callvalue_) external onlyOps { //remove payable later and add onlyOps modifier 
        (uint fee, ) = opsGel.getFeeDetails();
        _transfer(fee, ETH);

        // --- deposits to PYY (ex-Manager) ----
        bytes memory data = abi.encodeWithSelector(
            Test2(payable(PYY)).exchangeToUserToken.selector, 
            userDetails
        );

        // user ticketID later on to check the sequencer's inbox for unconfirmed txs
        uint ticketID = inbox.createRetryableTicket{value: address(this).balance}( //change msg.value to address(this).balance
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

    function startTask(uint callvalue_) external returns(bytes32 taskId) {
        (taskId) = opsGel.createTaskNoPrepayment(
            address(this),
            this.sendToArb.selector,
            address(this),
            abi.encodeWithSelector(this.checker.selector, callvalue_),
            ETH
        );
    }

    function checker(
        uint callvalue_
    ) external view returns(bool canExec, bytes memory execPayload) {
        if (address(this).balance > 0) {
            canExec = true;
        }
        execPayload = abi.encodeWithSelector(
            this.sendToArb.selector, callvalue_
        );
    }

}



