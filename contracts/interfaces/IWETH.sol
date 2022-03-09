//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;



interface IWETH {
    function deposit() external payable;
    function approve(address guy, uint wad) external returns (bool);
}

