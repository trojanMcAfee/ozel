//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/IL1_ETH_Bridge.sol';
import './OpsReady.sol';

import 'hardhat/console.sol';




contract PayMeFacetHop is OpsReady { 

    IL1_ETH_Bridge hop = IL1_ETH_Bridge(0xb8901acB165ed027E32754E0FFe830802919727f); //mainnet 

    uint chainId = 42161;  //Arbitrum

    address nullAddr = 0x0000000000000000000000000000000000000000;
    address public immutable owner;

    constructor(address _owner, address _opsGel) OpsReady(_opsGel) {
        owner = _owner;
    }

    receive() external payable {}


    // *** HOP PART ***** 

    function sendToArb() external payable { 
        hop.sendToL2{value: address(this).balance}(
            chainId, owner, address(this).balance, 0, 0, nullAddr, 0
        );
    }

    // *** GELATO PART ******

    function startTask() external returns(bytes32 taskId) {
        (taskId) = opsGel.createTaskNoPrepayment(
            address(this),
            this.sendToArb.selector,
            address(this),
            abi.encodeWithSelector(this.checker.selector),
            ETH
        );
    }

    function checker() external view returns(bool canExec, bytes memory execPayload) {
        if (address(this).balance > 0) {
            canExec = true;
        }
        execPayload = abi.encodeWithSelector(this.sendToArb.selector);
    }

}



