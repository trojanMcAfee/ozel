//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import './ozBeaconProxy.sol';
import '../interfaces/IOps.sol';

import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol";
import '@openzeppelin/contracts/utils/Address.sol';
import './PayMeFacetHop.sol';
import './StorageBeacon.sol';

import './ozUpgradeableBeacon.sol';

import 'hardhat/console.sol';



contract ProxyFactory {
 
    struct UserConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }

    address beacon;
    // address storageBeacon;

    address ETH;


    function createNewProxy(UserConfig memory userDetails_) external {
        bytes memory idData = abi.encodeWithSignature( 
            'issueUserID((address,address,uint256))', 
            userDetails_
        ); 

        (bool success, bytes memory returnData) = address(_getStorageBeacon()).call(idData);
        require(success, 'ProxyFactory: createNewProxy() failed');
        uint userId = abi.decode(returnData, (uint));

        ozBeaconProxy newProxy = new ozBeaconProxy(
            userId, 
            beacon,
            // address(_getStorageBeacon()),
            new bytes(0)
        );

        _startTask(address(newProxy));

         _getStorageBeacon().saveUserProxy(msg.sender, address(newProxy));

        // StorageBeacon(storageBeacon).saveUserProxy(msg.sender, address(newProxy));
    }


    function _getStorageBeacon() private view returns(StorageBeacon) {
        return StorageBeacon(ozUpgradeableBeacon(beacon).storageBeacon());
    }


    // StorageBeacon(ozUpgradeableBeacon(beacon).storageBeacon()).getOpsGel();

    // *** GELATO PART ******

    function _startTask(address beaconProxy_) public { 
        address opsGel = _getStorageBeacon().getOpsGel();

        (bytes32 id) = IOps(opsGel).createTaskNoPrepayment( 
            beaconProxy_,
            bytes4(abi.encodeWithSignature('sendToArb()')),
            beaconProxy_,
            abi.encodeWithSignature('checker()'),
            ETH
        );

        _getStorageBeacon().saveTaskId(beaconProxy_, id);
    }
}