//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;



interface IWETH {
    function deposit() external payable;
    function approve(address guy, uint wad) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

