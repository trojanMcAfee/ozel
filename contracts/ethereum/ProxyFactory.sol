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
    // using Address for address;

    // uint public num;

    // PayMeFacetHop payme;

    // address beacon;
    // address storageBeacon;

    address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

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


    // struct FixedConfig { 
    //     // address beacon;
    //     address inbox;
    //     address ops;
    //     address PYY;
    //     address emitter;
    //     // address storageBeacon;
    //     uint maxGas;
    // }

    // FixedConfig fxConfig;

    // constructor(
    //     address opsGel_, 
    //     address beacon_,
    //     address storageBeacon_
    // ) OpsReady(opsGel_) {
    //     beacon = beacon_;
    //     storageBeacon = storageBeacon_;
    // }

    constructor(
        address beacon_,
        address storageBeacon_,
        address ops_
        // FixedConfig memory fxConfig_
    ) {
        beacon = beacon_;
        storageBeacon = storageBeacon_;
        // fxConfig = fxConfig_;
    }

    // constructor(
    //     address beacon, 
    //     address inbox_,
    //     address opsGel_,
    //     address pyy_,
    //     address emitter_,
    //     address storageBeacon_,
    //     uint maxGas_, 
    //     UserConfig memory userDetails_,
    //     bytes memory data
    // ) {

    receive() external payable {} //remove after tests



    function createNewProxy(UserConfig memory userDetails_) external {
        // address storageBeacon = fxConfig.storageBeacon;
        // address beacon = fxConfig.beacon;

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

        // pyBeaconProxy newProxy = new pyBeaconProxy(
        //     userDetails_, 
        //     fxConfig,
        //     new bytes(0)
        // );
        
        // uint userId = 
        //     StorageBeacon(storageBeacon).getInternalId() == 0 ?
        //     0 : 
        //     StorageBeacon(storageBeacon).getInternalId() - 1;

        // _startTask(userId, address(newProxy));
        // _startTask(address(newProxy));

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
            // payme.sendToArb.selector,
            bytes4(abi.encodeWithSignature('sendToArb()')),
            beaconProxy_,
            abi.encodeWithSignature('checker()'),
            // abi.encodeWithSelector(this.checker.selector, autoRedeem_),
            ETH
        );

        taskIDs[address(beaconProxy_)] = id;

        // taskId = id;
    }

    // function checker( 
    //     uint autoRedeem_
    // ) external view returns(bool canExec, bytes memory execPayload) {
    //     if (address(this).balance > 0) {
    //         canExec = true;
    //     }
    //     execPayload = abi.encodeWithSelector(
    //         payme.sendToArb.selector, autoRedeem_
    //     );
    // }


}