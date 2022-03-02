//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/IL1_ETH_Bridge.sol';
import 'hardhat/console.sol';


contract PayMeFacetHop {


    IL1_ETH_Bridge hop = IL1_ETH_Bridge(0xb8901acB165ed027E32754E0FFe830802919727f); 

    // uint chainIdArb = 42161;

    address nullAddr = 0x0000000000000000000000000000000000000000;


    function sendToArb(
        uint _chainId, 
        address _recipient, 
        uint _amount
    ) external payable {
        console.log('msg.value: ', msg.value == _amount); //value is not being passed
        hop.sendToL2(_chainId, _recipient, _amount, 0, 0, nullAddr, 0);
    
    }

    

}