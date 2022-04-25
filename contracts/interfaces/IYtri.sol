//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


interface IYtri {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}