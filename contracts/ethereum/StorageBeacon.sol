//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/access/Ownable.sol';
import '../interfaces/IOps.sol';
import '../interfaces/DelayedInbox.sol';
import './PayMeFacetHop.sol';
import './ozUpgradeableBeacon.sol';

import 'hardhat/console.sol';


contract StorageBeacon is Ownable { 

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
        address ETH; 
        uint maxGas;
    }

    struct VariableConfig { 
        uint maxSubmissionCost;
        uint gasPriceBid;
        uint autoRedeem;
    }

    FixedConfig fxConfig;
    VariableConfig varConfig;

    mapping(address => bytes32) public taskIDs;
    mapping(address => bool) public tokenDatabase;
    mapping(uint => UserConfig) public idToUserDetails;
    mapping(address => address) proxyToUser; 
    mapping(address => address) userToProxy; 

    uint private internalId;

    ozUpgradeableBeacon beacon;


    modifier hasRole(bytes4 functionSig_) {
        require(beacon.canCall(msg.sender, address(this), functionSig_));
        _;
    }


    constructor(
        FixedConfig memory fxConfig_,
        VariableConfig memory varConfig_,
        address[] memory tokens
    ) {
        fxConfig = FixedConfig({
            inbox: fxConfig_.inbox,
            ops: fxConfig_.ops,
            PYY: fxConfig_.PYY,
            emitter: fxConfig_.emitter,
            gelato: payable(fxConfig_.gelato),
            ETH: fxConfig_.ETH, 
            maxGas: fxConfig_.maxGas
        });

        varConfig = VariableConfig({
            maxSubmissionCost: varConfig_.maxSubmissionCost,
            gasPriceBid: varConfig_.gasPriceBid,
            autoRedeem: varConfig_.autoRedeem
        });

        uint length = tokens.length;
        for (uint i=0; i < length;) {
            tokenDatabase[tokens[i]] = true;
            unchecked { ++i; }
        }
    }



    //State changing functions
    function issueUserID(UserConfig memory userDetails_) public hasRole(0x74e0ea7a) returns(uint id) {
        idToUserDetails[internalId] = userDetails_;
        id = internalId;
        internalId++;
    }
    
    function saveUserProxy(address sender_, address proxy_) external hasRole(0x68e540e5) {
        userToProxy[sender_] = proxy_;
        proxyToUser[proxy_] = sender_;
    }

    function saveTaskId(address proxy_, bytes32 id_) external hasRole(0xf2034a69) {
        taskIDs[proxy_] = id_;
    }

    function changeVariableConfig(VariableConfig memory newVarConfig_) external onlyOwner {
        varConfig = newVarConfig_;
    }

    function addTokenToDatabase(address newToken_) external onlyOwner {
        tokenDatabase[newToken_] = true;
    }

    function storeBeacon(address beacon_) external onlyOwner {
        beacon = ozUpgradeableBeacon(beacon_);
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
        return userToProxy[user_];
    }

    function getTaskID(address user_) external view returns(bytes32) {
        return taskIDs[getUserProxy(user_)];
    }

    function getUserByProxy(address proxy_) external view returns(address) {
        return proxyToUser[proxy_];
    }

    function queryTokenDatabase(address token_) external view returns(bool) {
        return tokenDatabase[token_];
    }
}




