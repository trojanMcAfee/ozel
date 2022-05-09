//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol";

import './OpsReady.sol';
import './PayMeFacetHop.sol';

import './StorageBridge.sol';

import 'hardhat/console.sol';



contract ProxyFactory is OpsReady {

    uint public num;

    PayMeFacetHop payme;

    address beacon;

    mapping(address => bytes32) public taskIDs;

    mapping(address => address) usersProxies;

    mapping(address => address) proxyByUser;

    struct userConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }


    // constructor(
    //     address payme_, 
    //     address beacon_,
    //     address opsGel_
    // ) OpsReady(opsGel_) {
    //     payme = PayMeFacetHop(payable(payme_));
    //     beacon = beacon_;
    // }

    constructor(address opsGel_) OpsReady(opsGel_) {}

    /**
        1. Initialize all storage somewhere
        2. encode storage vars that'll go in each beaconProxy (maxGas, gasPriceBid, etc)
        3. Pass the encoded data to the factory (new) as 2nd arg to init each proxy with its storage
        4. Add admin funcs to change storage

        Create a new model where the many proxies call one contract (called beacon), and this beacon calls
        the implementation. The beacon can hold the storage and in this way share the same upgradable 
        storage with all proxies

        Problem: storage in impl is empty because storage is not in the proxy but it has to be a solution
        that allows all proxies to share the same storage and be able to be upgraded at once
     */



    function createNewProxy(userConfig memory userDetails_) external {
        bytes memory initData = abi.encodeWithSignature( 
            'issueUserID((address,address,uint256))', 
            userDetails_
        ); 

        BeaconProxy newProxy = new BeaconProxy(beacon, new bytes(0));

        (bool success, ) = address(payme).call(initData);
        require(success, 'ProxyFactory: createNewProxy() failed');

        uint userId = payme.getInternalId() == 0 ? 0 : payme.getInternalId() - 1;


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