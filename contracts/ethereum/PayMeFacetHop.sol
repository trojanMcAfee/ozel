//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import {
    SafeERC20,
    IERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import '../interfaces/IL1_ETH_Bridge.sol';
import '../interfaces/DelayedInbox.sol';
import './OpsReady.sol';
import './FakePYY.sol';
import './Emitter.sol';

import 'hardhat/console.sol'; 

import '../interfaces/IOps.sol';

import './StorageBeacon.sol';



contract PayMeFacetHop {

    

    constructor(address ops_) {}

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

    struct VariableConfig {
        uint maxSubmissionCost;
        uint gasPriceBid;
        uint autoRedeem;
    }


    StorageBeacon.FixedConfig fxConfig;
    StorageBeacon.UserConfig userDetails;

    address storageBeacon;

    address ETH;


    modifier onlyOps() {
        require(msg.sender == fxConfig.ops, "OpsReady: onlyOps");
        _;
    }


    function sendToArb( 
        VariableConfig memory varConfig_,
        UserConfig memory userDetails_
        // BridgeConfig memory bridgeConfig_
        // address inbox_,
        // address opsGel_,
        // address pyy_,
        // uint maxSubmissionCost_,
        // uint maxGas_,
        // uint gasPriceBid_
    ) external payable { //onlyOps and external <-----------
        address inbox = fxConfig.inbox;
        address PYY = fxConfig.PYY;
        address emitter = fxConfig.emitter;
        address opsGel = fxConfig.ops;
        uint maxGas = fxConfig.maxGas;
        uint maxSubmissionCost = varConfig_.maxSubmissionCost;
        uint gasPriceBid = varConfig_.gasPriceBid;
        uint autoRedeem = varConfig_.autoRedeem;

        (uint fee, ) = IOps(opsGel).getFeeDetails();
        _transfer(fee, ETH);


        // userConfig memory userDetails = idToUserDetails[internalId_];

        bytes memory swapData = abi.encodeWithSelector(
            FakePYY(payable(PYY)).exchangeToUserToken.selector, 
            userDetails_
        );

        bytes memory ticketData = abi.encodeWithSelector(
            DelayedInbox(inbox).createRetryableTicket.selector, 
            PYY, 
            address(this).balance - autoRedeem, 
            maxSubmissionCost,  
            PYY, 
            PYY, 
            maxGas,  
            gasPriceBid, 
            swapData
        );

       

        console.log('msg.value in payme: ', msg.value);
        console.log('address(this).balance in payme: ', address(this).balance);

        // revert('here');

        console.log(1); 

        // console.log('swapData:');
        // console.logBytes(swapData);

        // bytes memory data2 = abi.encodeWithSignature(
        //     'getHello(address,uint256,uint256,address,address,uint256,uint256,bytes)',
        //     PYY, 
        //     address(this).balance - autoRedeem, 
        //     maxSubmissionCost,  
        //     PYY, 
        //     PYY, 
        //     maxGas,  
        //     gasPriceBid, 
        //     swapData
        // );

        (bool success, bytes memory returnData) = inbox.call{value: address(this).balance}(ticketData);
        require(success, 'PayMeFacetHop: retryable ticket failed');
        uint ticketID = abi.decode(returnData, (uint));
        console.log('ticketID: ', ticketID);


        
        // (bool success, bytes memory returnData) = inbox.delegatecall(ticketData);
        // require(success, 'PayMeFacetHop: sendToArb() failed');
        
        
        
        
        console.log(2);

        // revert('here');

        console.log(3);
        // console.logBytes(returnData);
        // uint ticketID = abi.decode(returnData, (uint));
        // console.log(4);
        // console.log('ticketID: ', ticketID);

        // uint ticketID = inbox.createRetryableTicket{value: address(this).balance}(
        //     PYY, 
        //     address(this).balance - autoRedeem, 
        //     maxSubmissionCost,  
        //     PYY, 
        //     PYY, 
        //     maxGas,  
        //     gasPriceBid, 
        //     data
        // ); 

        Emitter(emitter).forwardEvent(ticketID); 
    }


    function _transfer(uint256 _amount, address _paymentToken) internal {
        address gelato = fxConfig.gelato;
        if (_paymentToken == ETH) {
            (bool success, ) = gelato.call{value: _amount}("");
            require(success, "_transfer: ETH transfer failed");
        } else {
            SafeERC20.safeTransfer(IERC20(_paymentToken), gelato, _amount);
        }
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







// assembly {
        //     // Call the implementation.
        //     // out and outsize are 0 because we don't know the size yet.
        //     let result := callcode(gas(), inbox, balance(address()), add(ticketData, 32), mload(ticketData), 0, 0)

        //     // Copy the returned data.
        //     returndatacopy(0, 0, returndatasize())

        //     switch result
        //     // delegatecall returns 0 on error.
        //     case 0 {
        //         revert(0, returndatasize())
        //     }
        //     default {
        //         return(0, returndatasize())
        //     }
        // }



