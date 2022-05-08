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



contract PayMeFacetHop is OpsReady {

    uint public num;
    address public y;


    struct userConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }

    // userConfig userDetails; 

    address public PYY;

    uint maxSubmissionCost;
    uint maxGas;
    uint gasPriceBid;

    DelayedInbox inbox;

    address emitter;

    bytes32 public taskId;

    uint autoRedeem;


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

    // constructor(address opsGel_) OpsReady(opsGel_) {}

    constructor( // do storage just here and put a proxy on proxyFactory
        address _opsGel,
        address _pyy,
        address _inbox,
        uint _maxSubmissionCost,
        uint _maxGas,
        uint _gasPriceBid,
        address emitter_,
        uint autoRedeem_
    ) OpsReady(_opsGel) { 
        PYY = _pyy;
        inbox = DelayedInbox(_inbox);
        maxSubmissionCost = _maxSubmissionCost; 
        maxGas = _maxGas; 
        gasPriceBid = _gasPriceBid;
        emitter = emitter_;
        autoRedeem = autoRedeem_;
    }


    receive() external payable {}



    // function sendToArb(uint autoRedeem_) external onlyOps {
    //     (uint fee, ) = opsGel.getFeeDetails();
    //     _transfer(fee, ETH);

    //     bytes memory data = abi.encodeWithSelector(
    //         FakePYY(payable(PYY)).exchangeToUserToken.selector, 
    //         userDetails
    //     );

    //     uint ticketID = inbox.createRetryableTicket{value: address(this).balance}(
    //         PYY, 
    //         address(this).balance - autoRedeem_, 
    //         maxSubmissionCost,  
    //         PYY, 
    //         PYY, 
    //         maxGas,  
    //         gasPriceBid, 
    //         data
    //     ); 

    //     Emitter(emitter).forwardEvent(ticketID); 
    // }

    mapping(uint => userConfig) public userIDs;
    uint private internalId;



    function getUserDetails() public view returns(address) { //test func
        return userIDs[0].userToken;
    }

    function setNum() public { //test func
        num = 25;
    }
    


    function issueUserID(userConfig memory userDetails_) public {
        num = 23;
        y = userDetails_.user;
        userIDs[internalId] = userDetails_;
        internalId++;
    }

    function getInternalId() external view returns(uint) {
        return internalId;
    }



    function sendToArb(uint internalId_) external onlyOps { 
        (uint fee, ) = opsGel.getFeeDetails();
        _transfer(fee, ETH);

        userConfig memory userDetails = userIDs[internalId_];

        bytes memory data = abi.encodeWithSelector(
            FakePYY(payable(PYY)).exchangeToUserToken.selector, 
            userDetails
        );

        uint ticketID = inbox.createRetryableTicket{value: address(this).balance}(
            PYY, 
            address(this).balance - autoRedeem, 
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

    // function _startTask(uint autoRedeem_) public { 
    //     (bytes32 id) = opsGel.createTaskNoPrepayment( 
    //         address(this),
    //         this.sendToArb.selector,
    //         address(this),
    //         abi.encodeWithSignature('checker(uint256)', autoRedeem_),
    //         // abi.encodeWithSelector(this.checker.selector, autoRedeem_),
    //         ETH
    //     );

    //     taskId = id;
    // }

    // function checker(
    //     uint autoRedeem_
    // ) external view returns(bool canExec, bytes memory execPayload) {
    //     if (address(this).balance > 0) {
    //         canExec = true;
    //     }
    //     execPayload = abi.encodeWithSelector(
    //         this.sendToArb.selector, autoRedeem_
    //     );
    // }

}



