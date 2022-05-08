//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol";

import './OpsReady.sol';
import './PayMeFacetHop.sol';



contract ProxyFactory is OpsReady {

    uint public num;


    PayMeFacetHop payme;

    address beacon;

    mapping(address => bytes32) public taskIDs;

    mapping(address => address) usersProxies;

    struct userConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }


    constructor(
        address payme_, 
        address beacon_,
        address opsGel_
    ) OpsReady(opsGel_) {
        payme = PayMeFacetHop(payable(payme_));
        beacon = beacon_;
    }



    function createNewProxy(userConfig memory userDetails_) external {
        bytes memory initData = abi.encodeWithSignature( 
            'issueUserID((address,address,uint256))', 
            userDetails_
        ); 

        BeaconProxy newProxy = new BeaconProxy(beacon, initData);

        uint userId = payme.getInternalId() == 0 ? 0 : payme.getInternalId() - 1;
        num = userId;

        _startTask(userId, address(newProxy));
        // _startTask(0, address(newProxy));
        usersProxies[msg.sender] = address(newProxy);
    }


    function getUserProxy(address user_) public view returns(address) {
        return usersProxies[user_];
    }

    function getTaskID(address user_) external view returns(bytes32) {
        return taskIDs[getUserProxy(user_)];
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