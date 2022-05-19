// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


import 'hardhat/console.sol';

import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol';
import '../interfaces/IOps.sol';
import './StorageBeacon.sol';

import './ozUpgradeableBeacon.sol';



contract ozBeaconProxy is BeaconProxy { 
    using Address for address;

    StorageBeacon.FixedConfig fxConfig;
    StorageBeacon.UserConfig userDetails;

    address constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    
    constructor(
        uint userId_,
        address beacon_,
        bytes memory data_
    ) BeaconProxy(beacon_, data_) {
        userDetails = _getStorageBeacon().getUserById(userId_);               
        fxConfig = _getStorageBeacon().getFixedConfig();
    }                                    



    //Gelato checker
    function checker() external view returns(bool canExec, bytes memory execPayload) {
        if (address(this).balance > 0) {
            canExec = true;
        }
        execPayload = abi.encodeWithSignature('sendToArb()');
    }


    receive() external payable override {
        // require(msg.data.length > 0, "BeaconProxy: Receive() can only take ETH"); //<------ try what happens if sends eth with calldata (security)
    }


    function _getStorageBeacon() private view returns(StorageBeacon) {
        return StorageBeacon(ozUpgradeableBeacon(_beacon()).storageBeacon());
    }

 
    function _delegate(address implementation) internal override {
        StorageBeacon.VariableConfig memory varConfig =
             _getStorageBeacon().getVariableConfig();

        bytes memory data = abi.encodeWithSignature(
            'sendToArb((uint256,uint256,uint256),(address,address,uint256))', 
            varConfig,
            userDetails
        );

        assembly {
            let result := delegatecall(gas(), implementation, add(data, 32), mload(data), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
}





