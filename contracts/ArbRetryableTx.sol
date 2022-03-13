// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


interface ArbRetryableTx {
    function getLifetime() external view returns(uint);
    function getTimeout(bytes32 userTxHash) external view returns(uint);
}