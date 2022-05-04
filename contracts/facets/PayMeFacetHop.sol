//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/IL1_ETH_Bridge.sol';
import '../interfaces/DelayedInbox.sol';
import './OpsReady.sol';
import './Test2.sol';
import '../Emitter.sol';

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

    address emitter;


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
        uint userSlippage_,
        address emitter_
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

        emitter = emitter_;
    }

    receive() external payable {}


    function sendToArb2(uint callvalue_) external {

        bytes memory data = abi.encodeWithSelector(
            Test2(payable(PYY)).exchangeToUserToken.selector, 
            userDetails
        );

        /**
            1. sendL1FundedContractTransaction
            2. sendL2MessageFromOrigin
            3. sendContractTransaction
         */

        // uint x = inbox.sendL1FundedContractTransaction{value: address(this).balance}(
        //     maxGas,
        //     gasPriceBid,
        //     PYY,
        //     data
        // );

        // uint x = inbox.sendL2Message{value: address(this).balance}(data);


        uint x = inbox.sendContractTransaction{value: address(this).balance}(
            maxGas,
            gasPriceBid,
            PYY,
            address(this).balance,
            data
        );



        Emitter(emitter).forwardEvent(x);

    } 



    function sendToArb(uint callvalue_) external onlyOps {
        (uint fee, ) = opsGel.getFeeDetails();
        _transfer(fee, ETH);

        // --- deposits to PYY (ex-Manager) ----
        bytes memory data = abi.encodeWithSelector(
            Test2(payable(PYY)).exchangeToUserToken.selector, 
            userDetails
        );

        uint ticketID = inbox.createRetryableTicket( //change msg.value to address(this).balance
            PYY, 
            0, 
            10000000000000000, //maxSubmissionCost
            PYY, 
            PYY, 
            5000000, //maxGas 
            100000000000, //gasPriceBid
            data
        ); 

        Emitter(emitter).forwardEvent(ticketID);
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



