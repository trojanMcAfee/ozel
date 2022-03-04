//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/IL1_ETH_Bridge.sol';
import 'hardhat/console.sol';

interface IOps {
    function createTask(
        address execAddr,
        bytes4 execSelector,
        address resolverAddr,
        bytes calldata resolverData
    ) external returns(bytes32 task);
}




contract PayMeFacetHop {

    IL1_ETH_Bridge hop = IL1_ETH_Bridge(0xb8901acB165ed027E32754E0FFe830802919727f); 
    IOps opsGel = IOps(0xcB62d497Cd7C74eCC6bA367125bd1ee83c3dB2F8);

    uint chainId = 42161;  //Arbitrum

    address nullAddr = 0x0000000000000000000000000000000000000000;
    address recipient;

    constructor(address _recipient) {
        recipient = _recipient;
    }


    receive() external payable {}


    // *** HOP PART ***** //create a task and test

    function sendToArb() public payable { //PokeMe.sol calls this func
        hop.sendToL2{value: msg.value}(
            chainId, recipient, msg.value, 0, 0, nullAddr, 0
        );
        console.log('sent to Arbitrum...');
    }

    // *** GELATO PART ******

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


