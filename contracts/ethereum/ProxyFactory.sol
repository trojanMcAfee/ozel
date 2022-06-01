//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14; 


import './ozBeaconProxy.sol';
import '../interfaces/IOps.sol';
// import '@openzeppelin/contracts/utils/Address.sol';
import './StorageBeacon.sol';
import './ozUpgradeableBeacon.sol';
// import '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';

import './Errors.sol';

import 'hardhat/console.sol';




contract ProxyFactory is ReentrancyGuard, Initializable { 
    address private beacon;


    function initialize(address beacon_) external initializer {
        beacon = beacon_;
    }


    function createNewProxy(StorageBeacon.UserConfig memory userDetails_) external nonReentrant { //unsafe
        if (userDetails_.user == address(0) || userDetails_.userToken == address(0)) revert CantBeZero('address');
        if (userDetails_.userSlippage <= 0) revert CantBeZero('slippage');
        if (!_getStorageBeacon().queryTokenDatabase(userDetails_.userToken)) revert NotFoundInDatabase('token');

        bytes memory idData = abi.encodeWithSignature( 
            'issueUserID((address,address,uint256))', 
            userDetails_
        ); 

        (bool success, bytes memory returnData) = address(_getStorageBeacon()).call(idData);
        if (!success) revert CallFailed('ProxyFactory: createNewProxy failed');
        uint userId = abi.decode(returnData, (uint));

        ozBeaconProxy newProxy = new ozBeaconProxy(
            beacon,
            new bytes(0)
        );

        bytes memory createData = abi.encodeWithSignature(
            'initialize(uint256,address)',
            userId, beacon
        );
        (success, ) = address(newProxy).call(createData);
        if (!success) revert CallFailed('ProxyFactory: init failed');

        _startTask(address(newProxy));

        _getStorageBeacon().saveUserProxy(msg.sender, address(newProxy));
    }


    function _getStorageBeacon() private view returns(StorageBeacon) {
        return StorageBeacon(ozUpgradeableBeacon(beacon).storageBeacon());
    }


    // *** GELATO PART ******

    function _startTask(address beaconProxy_) private { 
        StorageBeacon.FixedConfig memory fxConfig = _getStorageBeacon().getFixedConfig(); 

        (bytes32 id) = IOps(fxConfig.ops).createTaskNoPrepayment( 
            beaconProxy_,
            bytes4(abi.encodeWithSignature('sendToArb()')),
            beaconProxy_,
            abi.encodeWithSignature('checker()'),
            fxConfig.ETH
        );

        _getStorageBeacon().saveTaskId(beaconProxy_, id);
    }
}