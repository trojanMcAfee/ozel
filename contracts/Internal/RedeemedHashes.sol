// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '@openzeppelin/contracts/access/Ownable.sol';
import '../interfaces/arbitrum/IRedeemedHashes.sol';
import '../Errors.sol';


/**
 * @notice Keeps a record -on L2- of L1 retryable tickets that have been
 * manually redeemed. 
 */
contract RedeemedHashes is IRedeemedHashes, Ownable {

    bytes32[] totalRedemptions;
    mapping(bytes32 => bytes32[]) taskIdToHashes; 

    /// @inheritdoc IRedeemedHashes
    function getRedeemsPerTask(bytes32 taskId_) external view returns(bytes32[] memory) {
        return taskIdToHashes[taskId_];
    }

    /// @inheritdoc IRedeemedHashes
    function storeRedemption(bytes32 taskId_, bytes32 hash_) external onlyOwner {
        totalRedemptions.push(hash_);
        taskIdToHashes[taskId_].push(hash_);
    }

    /// @inheritdoc IRedeemedHashes
    function wasRedeemed(bytes32 taskId_, bytes32 hash_) external view returns(bool) {
        bytes32[] memory hashes = taskIdToHashes[taskId_];
        if (hashes.length == 0) revert InvalidTask(taskId_);

        for (uint i=0; i < hashes.length;) {
            if (hashes[i] == hash_) return true;
            unchecked { ++i; }
        }
        return false;
    }

    /// @inheritdoc IRedeemedHashes
    function getTotalRedemptions() external view returns(bytes32[] memory) {
        return totalRedemptions;
    }
}