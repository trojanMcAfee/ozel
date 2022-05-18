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
import './FakePYY.sol';
import './Emitter.sol';

import 'hardhat/console.sol'; 

import '../interfaces/IOps.sol';

import './StorageBeacon.sol';



contract PayMeFacetHop {

    struct UserConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }


    // struct FixedConfig {  
    //     address inbox;
    //     address ops;
    //     address PYY;
    //     address emitter;
    //     address payable gelato; 
    //     uint maxGas;
    // }

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
    ) external payable { //onlyOps
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

        (bool success, bytes memory returnData) = inbox.call{value: address(this).balance}(ticketData);
        require(success, 'PayMeFacetHop: retryable ticket failed');
        uint ticketID = abi.decode(returnData, (uint));

        // Emitter(emitter).forwardEvent(ticketID); 
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

}





