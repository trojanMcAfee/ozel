//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import '../interfaces/IL1_ETH_Bridge.sol';
import '../interfaces/DelayedInbox.sol';
import './OpsReady.sol';
import './FakePYY.sol';
import './Emitter.sol';

import 'hardhat/console.sol'; 




contract PayMeFacetHop is OpsReady, Initializable { 

    address public num;


    struct userConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }

    userConfig userDetails; 

    address public PYY;

    uint maxSubmissionCost;
    uint maxGas;
    uint gasPriceBid;

    DelayedInbox inbox;

    address emitter;

    bytes32 public taskId;


    // constructor( 
    //     address _opsGel,
    //     address _pyy,
    //     address _inbox,
    //     uint _maxSubmissionCost,
    //     uint _maxGas,
    //     uint _gasPriceBid,
    //     address user_,
    //     address userToken_,
    //     uint userSlippage_,
    //     address emitter_,
    //     uint autoRedeem_
    // ) OpsReady(_opsGel) { 
    //     PYY = _pyy;
    //     inbox = DelayedInbox(_inbox);
    //     maxSubmissionCost = _maxSubmissionCost; 
    //     maxGas = _maxGas; 
    //     gasPriceBid = _gasPriceBid;

    //     userDetails = userConfig({
    //         user: user_,
    //         userToken: userToken_,
    //         userSlippage: userSlippage_
    //     });

    //     emitter = emitter_;

    //     _startTask(autoRedeem_);
    // }

    constructor(address opsGel_) OpsReady(opsGel_) {}


    receive() external payable {}

    function initialize2(
        address pyy_,
        address inbox_,
        uint maxSubmissionCost_,
        uint maxGas_,
        uint gasPriceBid_,
        address user_,
        address userToken_,
        uint userSlippage_,
        address emitter_,
        uint autoRedeem_
    ) external initializer {
        PYY = pyy_;
        inbox = DelayedInbox(inbox_);
        maxSubmissionCost = maxSubmissionCost_; 
        maxGas = maxGas_;
        gasPriceBid = gasPriceBid_;

        userDetails = userConfig({
            user: user_,
            userToken: userToken_,
            userSlippage: userSlippage_
        });

        emitter = emitter_;

        _startTask(autoRedeem_);
    }

    function initialize(
        address pyy_,
        address inbox_,
        uint maxSubmissionCost_,
        uint maxGas_,
        uint gasPriceBid_,
        address user_,
        address userToken_,
        uint userSlippage_,
        address emitter_,
        uint autoRedeem_
    ) external initializer {
        PYY = pyy_;
        inbox = DelayedInbox(inbox_);
        maxSubmissionCost = maxSubmissionCost_; 
        maxGas = maxGas_; 
        gasPriceBid = gasPriceBid_;

        userDetails = userConfig({
            user: user_,
            userToken: userToken_,
            userSlippage: userSlippage_
        });

        emitter = emitter_;

        _startTask(autoRedeem_);
    }


    function sendToArb(uint autoRedeem_) external onlyOps {
        (uint fee, ) = opsGel.getFeeDetails();
        _transfer(fee, ETH);

        bytes memory data = abi.encodeWithSelector(
            FakePYY(payable(PYY)).exchangeToUserToken.selector, 
            userDetails
        );

        uint ticketID = inbox.createRetryableTicket{value: address(this).balance}(
            PYY, 
            address(this).balance - autoRedeem_, 
            maxSubmissionCost,  
            PYY, 
            PYY, 
            maxGas,  
            gasPriceBid, 
            data
        ); 

        Emitter(emitter).forwardEvent(ticketID); 
    }


    // *** GELATO PART ******

    function _startTask(uint autoRedeem_) public { 
        (bytes32 id) = opsGel.createTaskNoPrepayment( 
            address(this),
            this.sendToArb.selector,
            address(this),
            abi.encodeWithSignature('checker(uint256)', autoRedeem_),
            // abi.encodeWithSelector(this.checker.selector, autoRedeem_),
            ETH
        );

        taskId = id;
    }

    function checker(
        uint autoRedeem_
    ) external view returns(bool canExec, bytes memory execPayload) {
        if (address(this).balance > 0) {
            canExec = true;
        }
        execPayload = abi.encodeWithSelector(
            this.sendToArb.selector, autoRedeem_
        );
    }

}



