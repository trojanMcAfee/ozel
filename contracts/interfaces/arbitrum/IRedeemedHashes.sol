// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;



interface IRedeemedHashes {

    /**
     * @dev Gets the L1 hashes, associated to a taskId, of the txs
     * that have been manually redeemed.
     * @param taskId_ Gelato's taskId associated to each account
     * @return bytes32[] Array of L1 tx hashes
     */
    function getRedeemsPerTask(bytes32 taskId_) external view returns(bytes32[] memory);

    /**
     * @dev Stores a completed manual redeemption on a retryable ticket
     * @param taskId_ Gelato's taskId associated to the account that initated the L1 transfer
     * @param hash_ L1 tx hash from the transfer (this is initiated by Gelato)
     */
    function storeRedemption(bytes32 taskId_, bytes32 hash_) external;

    /**
     * @dev Queries if a particular ticket's L1 tx hash was manually redeemed or not
     * @param taskId_ Gelato's taskId associated to the account where hash_ was initiated
     * @param hash_ L1 tx hash produced by Gelato when calling an account
     * @return bool If hash_ was manually redeemed or not
     */
    function wasRedeemed(bytes32 taskId_, bytes32 hash_) external view returns(bool);

    /**
     * @dev Gets all the manual redemptions done in the system for all accounts
     * @return bytes32[] Retryable ticket's L1 tx hashes that have been manually redeemed
     */
    function getTotalRedemptions() external view returns(bytes32[] memory);
}