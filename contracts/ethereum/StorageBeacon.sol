//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/IOps.sol';
import '../interfaces/DelayedInbox.sol';
import './PayMeFacetHop.sol';

import 'hardhat/console.sol';


contract StorageBeacon { 

    struct UserConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }

    struct FixedConfig {  
        address inbox;
        address ops;
        address PYY;
        address emitter;
        address payable gelato; //new
        uint maxGas;
    }

    FixedConfig fxConfig;


    struct VariableConfig {
        uint maxSubmissionCost;
        uint gasPriceBid;
        uint autoRedeem;
    }

    VariableConfig varConfig;



    constructor(
        FixedConfig memory fxConfig_,
        VariableConfig memory varConfig_
    ) {
        fxConfig = FixedConfig({
            inbox: fxConfig_.inbox,
            ops: fxConfig_.ops,
            PYY: fxConfig_.PYY,
            emitter: fxConfig_.emitter,
            gelato: payable(fxConfig_.gelato),
            maxGas: fxConfig_.maxGas
        });

        varConfig = VariableConfig({
            maxSubmissionCost: varConfig_.maxSubmissionCost,
            gasPriceBid: varConfig_.gasPriceBid,
            autoRedeem: varConfig_.autoRedeem
        });
    }



    mapping(uint => UserConfig) public idToUserDetails;
    uint private internalId;


    function getOpsGel() external view returns(address) {
        return fxConfig.ops;
    }



    function issueUserID(UserConfig memory userDetails_) public returns(uint id) {
        idToUserDetails[internalId] = userDetails_;
        id = internalId;
        internalId++;
    }

    function getUserById(uint userId_) external view returns(UserConfig memory) {
        return idToUserDetails[userId_];
    }

    // function getInternalId() external view returns(uint) {
    //     return internalId;
    // }

    function getFixedConfig() external view returns(FixedConfig memory) {
        return fxConfig;
    }

    function getVariableConfig() external view returns(VariableConfig memory) {
        return varConfig; 
    }

    
    // function getVariableConfig() external view returns(bytes memory data) {
    //     //is it possible to access stored log data from another contract?

    //     // userConfig memory userDetails_ = idToUserDetails[internalId_];
    //     // data = abi.encode(userDetails_, bridgeConfig);

    //     data = abi.encode(varConfig); 
    // }



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




