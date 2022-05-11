//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/DelayedInbox.sol';
import './PayMeFacetHop.sol';



contract StorageBeacon {

    address payme; //this is the non-storage impl

    // address opsGel;
    // address PYY;
    // address emitter;
    
    // uint maxSubmissionCost;
    // uint maxGas;
    // uint gasPriceBid;
    // uint autoRedeem;

    // address inbox;

    struct userConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }

    struct BridgeConfig {
        address inbox;
        address opsGel;
        address PYY;
        address emitter;
        uint maxSubmissionCost;
        uint maxGas;
        uint gasPriceBid;
        uint autoRedeem;
    }

    BridgeConfig bridgeConfig;


    constructor( 
        address payme_,
        address opsGel_,
        address pyy_,
        address inbox_,
        uint maxSubmissionCost_,
        uint maxGas_,
        uint gasPriceBid_,
        address emitter_,
        uint autoRedeem_
    )  { 
        payme = payme_;
        // opsGel = _opsGel;
        // PYY = _pyy;
        // inbox = _inbox;
        // maxSubmissionCost = _maxSubmissionCost; 
        // maxGas = _maxGas; 
        // gasPriceBid = _gasPriceBid;
        // emitter = emitter_;
        // autoRedeem = autoRedeem_;

        bridgeConfig = BridgeConfig({
            inbox: inbox_,
            opsGel: opsGel_,
            PYY: pyy_,
            emitter: emitter_,
            maxSubmissionCost: maxSubmissionCost_,
            maxGas: maxGas_,
            gasPriceBid: gasPriceBid_,
            autoRedeem: autoRedeem_
        });
    }


    mapping(uint => userConfig) public idToUserDetails;
    uint private internalId;



    function issueUserID(userConfig memory userDetails_) public {
        idToUserDetails[internalId] = userDetails_;
        internalId++;
    }

    function getInternalId() external view returns(uint) {
        return internalId;
    }

    
    function getStorage(uint internalId_) external view returns(bytes memory data) {
        //is it possible to access stored log data from another contract?
        userConfig memory userDetails_ = idToUserDetails[internalId_];
        data = abi.encode(userDetails_, bridgeConfig);
    }



    // function routerCall(uint internalId_) external {

    //     userConfig memory userDetails = idToUserDetails[internalId_];

    //     bytes memory data = abi.encodeWithSelector(
    //         PayMeFacetHop(payable(payme)).sendToArb.selector, 
    //         userDetails,
    //         inbox,
    //         opsGel,
    //         PYY,
    //         maxSubmissionCost,
    //         maxGas,
    //         gasPriceBid
    //     );

    //     (bool success, ) = payme.delegatecall(data);
    //     require(success, 'CoBeacon: routerCall() failed');

    // }

    //put here the admin funcs to change storage vars


    // function setImplBeacon(address implBeacon_) external {
    //     implBeacon = implBeacon_;
    // }
  

}




