//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/Proxy.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol";

import './OpsReady.sol';
import './PayMeFacetHop.sol';
import './AppStorage.sol';


contract ProxyFactory is OpsReady, Proxy, ERC1967Upgrade {

    AppStorage s;

    PayMeFacetHop payme;

    mapping(address => uint) public taskIDs;


    constructor(address payme_) OpsReady(opsGel_) {
        payme = payme_;
    }



    function createNewProxy(address beacon_) external returns(BeaconProxy) {

        bytes initData = abi.encodeWithSelector(
            payme.initialize.selector, 
            s.pyy,
            s.inbox,
            s.maxSubmissionCost,
            s.maxGas,
            s.gasPriceBid,
            s.user,
            s.userToken,
            s.userSlippage,
            s.emitter,
            s.autoRedeem
        );

        BeaconProxy newProxy = new BeaconProxy(beacon_, initData);
        _startTask(autoRedeem_, proxyContract_);

        return newProxy;

    }

    // *** GELATO PART ******

    function _startTask(uint autoRedeem_, BeaconProxy proxyContract_) private { 
        (bytes32 id) = opsGel.createTaskNoPrepayment( 
            proxyContract_,
            payme.sendToArb.selector,
            proxyContract_,
            abi.encodeWithSignature('checker(uint256)', autoRedeem_),
            // abi.encodeWithSelector(this.checker.selector, autoRedeem_),
            ETH
        );

        taskIDs[address(proxyContract_)] = id;

        // taskId = id;
    }

    function checker( //check in Gelato's docs how checker is called, who calls it, how params are passed, does it have to be in the contract per se (i think yes)
        uint autoRedeem_
    ) external view returns(bool canExec, bytes memory execPayload) {
        if (address(this).balance > 0) {
            canExec = true;
        }
        execPayload = abi.encodeWithSelector(
            payme.sendToArb.selector, autoRedeem_
        );
    }


}