//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


// import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import './pyBeaconProxy.sol';
import '../interfaces/IOps.sol';

import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol";
import '@openzeppelin/contracts/utils/Address.sol';

import './OpsReady.sol';
import './PayMeFacetHop.sol';

import './StorageBeacon.sol';

import 'hardhat/console.sol';



contract ProxyFactory {
 
    // address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    mapping(address => bytes32) public taskIDs;

    mapping(address => address) usersProxies;

    mapping(address => address) proxyByUser;

    struct UserConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }

    address beacon;
    address storageBeacon;

    address ETH;


    // constructor(
    //     address beacon_,
    //     address storageBeacon_
    // ) {
    //     beacon = beacon_;
    //     storageBeacon = storageBeacon_;
    // }


    function createNewProxy(UserConfig memory userDetails_) external {
        bytes memory idData = abi.encodeWithSignature( 
            'issueUserID((address,address,uint256))', 
            userDetails_
        ); 

        (bool success, bytes memory returnData) = storageBeacon.call(idData);
        require(success, 'ProxyFactory: createNewProxy() failed');
        uint userId = abi.decode(returnData, (uint));

        pyBeaconProxy newProxy = new pyBeaconProxy(
            userId, 
            beacon,
            storageBeacon,
            new bytes(0)
        );

        _startTask(address(newProxy));

        StorageBeacon(storageBeacon).saveUserProxy(msg.sender, address(newProxy));

        usersProxies[msg.sender] = address(newProxy);
        proxyByUser[address(newProxy)] = msg.sender;
    }





    function getUserProxy(address user_) public view returns(address) {
        return usersProxies[user_];
    }

    function getTaskID(address user_) external view returns(bytes32) {
        return taskIDs[getUserProxy(user_)];
    }

    function getUserByProxy(address proxy_) external view returns(address) {
        return proxyByUser[proxy_];
    }


    // *** GELATO PART ******

    function _startTask(address beaconProxy_) public { 
        address opsGel = StorageBeacon(storageBeacon).getOpsGel();

        (bytes32 id) = IOps(opsGel).createTaskNoPrepayment( 
            beaconProxy_,
            bytes4(abi.encodeWithSignature('sendToArb()')),
            beaconProxy_,
            abi.encodeWithSignature('checker()'),
            ETH
        );

        taskIDs[address(beaconProxy_)] = id;
    }
}