//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


interface IYtricrypto {
    function deposit(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}