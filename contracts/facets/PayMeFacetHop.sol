//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/IL1_ETH_Bridge.sol';
import './OpsReady.sol';

import 'hardhat/console.sol';



contract Resolver is OpsReady {

    address public immutable owner;

    constructor(address _opsGel, address _owner) OpsReady(_opsGel) {
        owner = _owner;
    }

    receive() external payable {}


    function sayHello() external onlyOps {
        (uint fee, ) = opsGel.getFeeDetails();
        _transfer(fee, ETH);

        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, 'Resolver: ETH transfer failed');

    }

    function startTask() external returns(bytes32 taskId) {
        // (, address feeToken) = opsGel.getFeeDetails();

        (taskId) = opsGel.createTaskNoPrepayment(
            address(this),
            this.sayHello.selector,
            address(this),
            abi.encodeWithSelector(this.checker.selector),
            ETH
        );
    }

    function checker() 
        external 
        view 
        returns(bool canExec, bytes memory execPayload) 
    {
        if (address(this).balance > 0) {
            canExec = true;
        }
        execPayload = abi.encodeWithSelector(this.sayHello.selector);
    }

}




contract PayMeFacetHop {

    IL1_ETH_Bridge hop = IL1_ETH_Bridge(0xb8901acB165ed027E32754E0FFe830802919727f); 
    IOps opsGel = IOps(0xB3f5503f93d5Ef84b06993a1975B9D21B962892F);

    uint chainId = 42161;  //Arbitrum

    address nullAddr = 0x0000000000000000000000000000000000000000;
    address recipient;

    constructor(address _recipient) {
        recipient = _recipient;
    }


    receive() external payable {}


    // *** HOP PART ***** //create a task and test (1 task per 1 contract)

    function sendToArb() public payable { //PokeMe.sol calls this func
        hop.sendToL2{value: msg.value}(
            chainId, recipient, msg.value, 0, 0, nullAddr, 0
        );
        console.log('sent to Arbitrum...');
        console.log('msg.sender on sendToArb: ', msg.sender);
    }

    // *** GELATO PART ******

    // function startTask() external {
    //     opsGel.createTask(
    //         address(this),
    //         this.sendToArb.selector,
    //         address(this),
    //         abi.encodeWithSelector(this.sendToArb.selector)
    //     );
    //     console.log('msg.sender on startTask: ', msg.sender);
    // }

    function checker() ///the func that gets checked by Gelato (?)
        external 
        view 
        returns(bool canExec, bytes memory execPayload) 
    {
        if (address(this).balance > 0) {
            canExec = true;
        }

        execPayload = abi.encodeWithSelector(this.sendToArb.selector);
    }

}



