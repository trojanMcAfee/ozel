// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


error InvalidTask(bytes32 taskId);


contract RedeemedHashes {

    bytes32[] totalRedemptions;
    mapping(bytes32 => bytes32[]) taskIdToHashes;

    function getRedeemsPerTask(bytes32 taskId_) external view returns(bytes32[] memory) {
        return taskIdToHashes[taskId_];
    }

    function storeRedemption(bytes32 taskId_, bytes32 hash_) external {
        totalRedemptions.push(hash_);
        taskIdToHashes[taskId_].push(hash_);
    }

    function wasRedeemed(bytes32 taskId_, bytes32 hash_) external view returns(bool) {
        bytes32[] memory hashes = taskIdToHashes[taskId_];
        if (hashes.length == 0) revert InvalidTask(taskId_);

        for (uint i=0; i < hashes.length;) {
            if (hashes[i] == hash_) return true;
            unchecked { ++i; }
        }
        return false;
    }
}