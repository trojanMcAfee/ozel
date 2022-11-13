// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


interface NodeInterface {

    function estimateRetryableTicket(
        address sender,
        uint256 deposit,
        address destAddr,
        uint256 l2CallValue,
        uint256 maxSubmissionCost,
        address excessFeeRefundAddress,
        address callValueRefundAddress,
        uint256 maxGas,
        uint256 gasPriceBid,
        bytes calldata data
    ) external pure returns (uint256, uint256);

    function gasEstimateL1Component(
        address to,
        bool contractCreation,
        bytes calldata data
    )
        external
        payable
        returns (
            uint64 gasEstimateForL1,
            uint256 baseFee,
            uint256 l1BaseFeeEstimate
        );

    function nitroGenesisBlock() external pure returns (uint256 number);
}