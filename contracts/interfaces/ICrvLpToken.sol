//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


interface ICrvLpToken {
    function totalSupply() external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function balanceOf(address account) external view returns (uint256);
}