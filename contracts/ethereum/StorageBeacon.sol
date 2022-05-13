//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/DelayedInbox.sol';
import './PayMeFacetHop.sol';



contract StorageBeacon { 

    // address payme; 

    // address opsGel;
    // address PYY;
    // address emitter;
    
    // uint maxSubmissionCost;
    // uint maxGas;
    // uint gasPriceBid;
    // uint autoRedeem;

    // address inbox;

    struct UserConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }

    struct FixedConfig { 
        // address beacon;
        address inbox;
        address ops;
        address PYY;
        address emitter;
        // address storageBeacon;
        uint maxGas;
    }

    FixedConfig fxConfig;


     struct VariableConfig {
        uint maxSubmissionCost;
        uint gasPriceBid;
        uint autoRedeem;
    }

    VariableConfig varConfig;


    // constructor( 
    //     address payme_,
    //     address opsGel_,
    //     address pyy_,
    //     address inbox_,
    //     uint maxGas_,
    //     address emitter_,
    //     uint maxSubmissionCost_,
    //     uint gasPriceBid_,
    //     uint autoRedeem_
    // )  { 
    //     payme = payme_;
    //     // opsGel = _opsGel;
    //     // PYY = _pyy;
    //     // inbox = _inbox;
    //     // maxSubmissionCost = _maxSubmissionCost; 
    //     // maxGas = _maxGas; 
    //     // gasPriceBid = _gasPriceBid;
    //     // emitter = emitter_;
    //     // autoRedeem = autoRedeem_;

    //     bridgeConfig = BridgeConfig({
    //         inbox: inbox_,
    //         opsGel: opsGel_,
    //         PYY: pyy_,
    //         emitter: emitter_,
    //         maxSubmissionCost: maxSubmissionCost_,
    //         maxGas: maxGas_,
    //         gasPriceBid: gasPriceBid_,
    //         autoRedeem: autoRedeem_
    //     });

    //     varConfig = VariableConfig({
    //         maxSubmissionCost: maxSubmissionCost_,
    //         gasPriceBid: gasPriceBid_,
    //         autoRedeem: autoRedeem_
    //     }); 
    // }

    constructor(
        FixedConfig memory fxConfig_,
        VariableConfig memory varConfig_
    ) {
        fxConfig = fxConfig_;
        varConfig = varConfig_;
    }


    mapping(uint => UserConfig) public idToUserDetails;
    uint private internalId;



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




