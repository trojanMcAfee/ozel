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

    address ETH;
    address beacon;


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
            new bytes(0)
        );

        _startTask(address(newProxy));

        _getStorageBeacon().saveUserProxy(msg.sender, address(newProxy));
    }


    function _getStorageBeacon() private view returns(StorageBeacon) {
        return StorageBeacon(ozUpgradeableBeacon(beacon).storageBeacon());
    }


    // *** GELATO PART ******

    function _startTask(address beaconProxy_) public { 
        address opsGel = _getStorageBeacon().getOpsGel();
        console.log('opsGel in factory: ', opsGel);
        console.log('eth in factory: ', ETH);

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