//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/access/Ownable.sol';
import '../interfaces/IOps.sol';
import '../interfaces/DelayedInbox.sol';
import './PayMeFacetHop.sol';
import './ozUpgradeableBeacon.sol';

import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

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

    struct EmergencyMode {
        ISwapRouter swapRouter;
        AggregatorV3Interface priceFeed; 
        uint24 poolFee;
        address tokenIn;
        address tokenOut; 
    }

    FixedConfig fxConfig;
    VariableConfig varConfig;
    EmergencyMode eMode;

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
        EmergencyMode memory eMode_,
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

        eMode = EmergencyMode({
            swapRouter: ISwapRouter(eMode_.swapRouter),
            priceFeed: AggregatorV3Interface(eMode_.priceFeed),
            poolFee: eMode_.poolFee,
            tokenIn: eMode_.tokenIn,
            tokenOut: eMode_.tokenOut
        });

        uint length = tokens.length;
        for (uint i=0; i < length;) {
            tokenDatabase[tokens[i]] = true;
            unchecked { ++i; }
        }
    }

 

    //State changing functions
    function issueUserID(UserConfig memory userDetails_) external hasRole(0x74e0ea7a) returns(uint id) {
        idToUserDetails[internalId] = userDetails_;
        id = internalId;
        unchecked { ++internalId; }
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

    function changeEmergencyMode(EmergencyMode memory newEmode_) external onlyOwner {
        eMode = newEmode_;
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

    function getEmergencyMode() external view returns(EmergencyMode memory) {
        return eMode;
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




