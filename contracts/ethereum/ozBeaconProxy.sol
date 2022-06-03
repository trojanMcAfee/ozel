// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


import 'hardhat/console.sol';

import '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol';
import '../interfaces/IOps.sol';
import './StorageBeacon.sol';

import './ozUpgradeableBeacon.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/access/Ownable.sol';

import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';



contract ozBeaconProxy is ReentrancyGuard, Initializable, BeaconProxy { 

    StorageBeacon.UserConfig userDetails;
    StorageBeacon.FixedConfig fxConfig;

    address private beacon; 
    
    constructor(
        address beacon_,
        bytes memory data_
    ) BeaconProxy(beacon_, data_) {}                                    



    receive() external payable override {}


    function _getStorageBeacon() private view returns(StorageBeacon) {
        return StorageBeacon(ozUpgradeableBeacon(_beacon()).storageBeacon());
    }


    function checker() external view returns(bool canExec, bytes memory execPayload) {
        if (address(this).balance > 0) {
            canExec = true;
        }
        execPayload = abi.encodeWithSignature('sendToArb()');
    }

 
    function _delegate(address implementation) internal override { 
        bytes memory data; 

        StorageBeacon.VariableConfig memory varConfig =
             _getStorageBeacon().getVariableConfig();

        //first 4 bytes on ozPayMe
        if (
            bytes4(msg.data) == 0xda35a26f || //initialize
            bytes4(msg.data) == 0x66eb4b13 || //changeUserToken
            bytes4(msg.data) == 0x8fe913f1  //changeUserSlippage
        ) { 
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






