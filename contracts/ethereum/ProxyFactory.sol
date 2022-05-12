//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


// import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import './pyBeaconProxy.sol';

import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol";
import '@openzeppelin/contracts/utils/Address.sol';

import './OpsReady.sol';
import './PayMeFacetHop.sol';

import './StorageBeacon.sol';

import 'hardhat/console.sol';



contract ProxyFactory is OpsReady {
    // using Address for address;

    uint public num;

    PayMeFacetHop payme;

    // address beacon;
    // address storageBeacon;

    mapping(address => bytes32) public taskIDs;

    mapping(address => address) usersProxies;

    mapping(address => address) proxyByUser;

    struct UserConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }


    struct FixedConfig { //fix OpsReady
        address beacon;
        address inbox; 
        // address opsGel; 
        // address gelato;
        address PYY;
        address emitter;
        address storageBeacon;
        uint maxGas;
    }

    FixedConfig fxConfig;

    // constructor(
    //     address opsGel_, 
    //     address beacon_,
    //     address storageBeacon_
    // ) OpsReady(opsGel_) {
    //     beacon = beacon_;
    //     storageBeacon = storageBeacon_;
    // }

    constructor(FixedConfig memory fxConfig_) OpsReady(fxConfig_.opsGel) {
        fxConfig = fxConfig_;
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



    function createNewProxy(UserConfig memory userDetails_) external {
        address storageBeacon = fxConfig.storageBeacon;
        address beacon = fxConfig.beacon;

        bytes memory idData = abi.encodeWithSignature( 
            'issueUserID((address,address,uint256))', 
            userDetails_
        ); 

        (bool success, bytes memory returnData) = storageBeacon.call(idData);
        require(success, 'ProxyFactory: createNewProxy() failed');
        (uint userId) = abi.decode(returnData, (uint));

        pyBeaconProxy newProxy = new pyBeaconProxy(
            userDetails_, 
            fxConfig,
            new bytes(0)
        );
        
        // uint userId = 
        //     StorageBeacon(storageBeacon).getInternalId() == 0 ?
        //     0 : 
        //     StorageBeacon(storageBeacon).getInternalId() - 1;

        // _startTask(userId, address(newProxy));

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

    function _startTask(uint internalId_, address proxyContract_) public { 
        (bytes32 id) = opsGel.createTaskNoPrepayment( 
            proxyContract_,
            payme.sendToArb.selector,
            proxyContract_,
            abi.encodeWithSignature('checker(uint256)', internalId_),
            // abi.encodeWithSelector(this.checker.selector, autoRedeem_),
            ETH
        );

        taskIDs[address(proxyContract_)] = id;

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