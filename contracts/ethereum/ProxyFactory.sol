//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import './ozBeaconProxy.sol';
import '../interfaces/IOps.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import './StorageBeacon.sol';
import './ozUpgradeableBeacon.sol';
import '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';

import 'hardhat/console.sol';




contract ProxyFactory is ReentrancyGuard, Initializable { 
    using Address for address;

    address beacon;


    function initialize(address beacon_) external initializer {
        beacon = beacon_;
    }


    function createNewProxy(StorageBeacon.UserConfig memory userDetails_) external nonReentrant { //untrustworthy
        require(userDetails_.user != address(0) && userDetails_.userToken != address(0), 'User addresses cannnot be 0');
        require(userDetails_.userSlippage > 0, 'User slippage cannot be 0');
        require(_getStorageBeacon().queryTokenDatabase(userDetails_.userToken), 'Token not found in database');

        bytes memory idData = abi.encodeWithSignature( 
            'issueUserID((address,address,uint256))', 
            userDetails_
        ); 
        bytes memory returnData = 
            address(_getStorageBeacon()).functionCall(idData, 'ProxyFactory: createNewProxy failed'); 
        uint userId = abi.decode(returnData, (uint));

        ozBeaconProxy newProxy = new ozBeaconProxy(
            beacon,
            new bytes(0)
        );

        bytes memory createData = abi.encodeWithSignature(
            'initialize(uint256,address)',
            userId, beacon
        );
        address(newProxy).functionCall(createData, 'ProxyFactory: init failed');

        _startTask(address(newProxy));

        _getStorageBeacon().saveUserProxy(msg.sender, address(newProxy));
    }


    function _getStorageBeacon() private view returns(StorageBeacon) {
        return StorageBeacon(ozUpgradeableBeacon(beacon).storageBeacon());
    }


    // *** GELATO PART ******

    function _startTask(address beaconProxy_) private { 
        StorageBeacon.FixedConfig memory f = _getStorageBeacon().getFixedConfig(); 
        address opsGel = f.ops;
        address ETH = f.ETH;

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