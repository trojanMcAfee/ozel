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
        address payable gelato;
        uint maxGas;
    }

    FixedConfig fxConfig;


    struct VariableConfig {
        uint maxSubmissionCost;
        uint gasPriceBid;
        uint autoRedeem;
    }

    VariableConfig varConfig;

    mapping(address => bytes32) public taskIDs;

    mapping(address => address) usersProxies;

    mapping(address => address) proxyByUser;



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

    //State changing functions
    function issueUserID(UserConfig memory userDetails_) public returns(uint id) {
        idToUserDetails[internalId] = userDetails_;
        id = internalId;
        internalId++;
    }
    
    function saveUserProxy(address sender_, address proxy_) external {
        usersProxies[sender_] = proxy_;
        proxyByUser[proxy_] = sender_;
    }

    function saveTaskId(address proxy_, bytes32 id_) external {
        taskIDs[proxy_] = id_;
    }


    //View functions
    function getUserById(uint userId_) external view returns(UserConfig memory) {
        return idToUserDetails[userId_];
    }

    function getFixedConfig() external view returns(FixedConfig memory) {
        return fxConfig;
    }

    function getVariableConfig() external view returns(VariableConfig memory) {
        return varConfig; 
    }

    function getUserProxy(address user_) public view returns(address) {
        return usersProxies[user_];
    }

    function getTaskID(address user_) external view returns(bytes32) {
        return taskIDs[getUserProxy(user_)];
    }

    function getUserByProxy(address proxy_) external view returns(address) {
        return proxyByUser[proxy_];
    }
}




