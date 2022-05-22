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

    StorageBeacon.UserConfig userDetails;

    
    constructor(
        address beacon_,
        bytes memory data_
    ) BeaconProxy(beacon_, data_) {}                                    



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
        bytes memory data;

        StorageBeacon.VariableConfig memory varConfig =
             _getStorageBeacon().getVariableConfig();

        //first 4 bytes of initialize() on PayMeFacetHop
        if (bytes4(msg.data) == 0xb4988fd0) {
            data = msg.data;
        } else {
            data = abi.encodeWithSignature(
                'sendToArb((uint256,uint256,uint256),(address,address,uint256))', 
                varConfig,
                userDetails
            );
        }

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





