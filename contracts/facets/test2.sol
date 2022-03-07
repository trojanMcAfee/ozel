//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;



import 'hardhat/console.sol';

contract Test2 {


 function getMainnet(address _owner) external view {
     console.log('owner: ', _owner); 
 }



}