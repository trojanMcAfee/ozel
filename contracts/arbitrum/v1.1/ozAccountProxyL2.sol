// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
// import '@openzeppelin/contracts/proxy/Proxy.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '../../libraries/LibCommon.sol';
import '../../Errors.sol';
import './ozLoupeFacetV1_1.sol';

import 'hardhat/console.sol';


contract ozAccountProxyL2 is Initializable, BeaconProxy {

    // using LibCommon for bytes; 

    bytes accData;

    address private immutable ops;
    address private immutable OZL;

    // event NewToken(address indexed newToken);
    // event NewSlippage(uint16 indexed newSlippage);

    constructor(
        address beacon_,
        address ops_,
        address ozDiamond_
    ) BeaconProxy(beacon_, new bytes(0)) {
        ops = ops_;
        OZL = ozDiamond_;
    }



    //--------

    receive() external payable override {}

    function checker() external view returns(bool canExec, bytes memory execPayload) { 
        uint amountToSend = address(this).balance;
        if (amountToSend > 0) canExec = true;

        execPayload = abi.encodeWithSignature(
            'exchangeToAccountToken(bytes,uint256,address)', 
            accData,
            amountToSend,
            address(this)
        );
    }

   

    function initialize(bytes memory accData_) external initializer {
        accData = accData_;
    }

    //-------

    function _delegate(address implementation) internal override {
        // if (msg.sender != ops) revert NotAuthorized(msg.sender);
        // (bool success, ) = implementation.call{value: address(this).balance}(msg.data);
        // require(success);

        //-------
        if ( ozLoupeFacetV1_1(OZL).isSelectorAuthorized(bytes4(msg.data)) ) { 
            Address.functionDelegateCall(implementation, msg.data);
        } else {
            if (msg.sender != ops) revert NotAuthorized(msg.sender);
            (bool success, ) = implementation.call{value: address(this).balance}(msg.data);
            require(success);
        }
    }

}