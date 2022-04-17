// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


interface ArbRetryableTx {
    function getLifetime() external view returns(uint);
    function getTimeout(bytes32 ticketId) external view returns(uint);
    function getBeneficiary(bytes32 ticketId) external returns(address);
}