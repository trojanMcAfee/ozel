//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/IL1_ETH_Bridge.sol';
import 'hardhat/console.sol';


contract PayMeFacetHop {

    IL1_ETH_Bridge hop = IL1_ETH_Bridge(0xb8901acB165ed027E32754E0FFe830802919727f); 

    uint chainId = 42161;  //Arbitrum

    address nullAddr = 0x0000000000000000000000000000000000000000;
    address recipient;

    constructor(address _recipient) {
        recipient = _recipient;
    }

    receive() external payable {
        uint bal = address(this).balance;
        console.log('bal: ', bal / 1 ether);

        sendToArb(); //searching if it's possible to star this tx with a new gasLimit
    }


    function sendToArb() public payable {
        hop.sendToL2{value: msg.value}(chainId, recipient, msg.value, 0, 0, nullAddr, 0);
    }

    

}