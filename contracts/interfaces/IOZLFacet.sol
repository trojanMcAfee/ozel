// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;



interface IOZLFacet {

    /**
     * @notice Main bridge function on L2
     * @dev Receives the ETH coming from L1, initiates L2 swaps, and 
     * deposits the system's fees.
     * @param accountDetails_ Details of the account that received the L1 transfer
     */
    function exchangeToAccountToken(
        AccountConfig calldata accountDetails_
    ) external payable;

    /**
     * @dev Allow an OZL holder to withdraw their share of AUM by redeeming them.
     * Once redeemption has occurred, it rebalances OZL's totalySupply (aka rebases it back 100)
     * @param accountDetails_ Details of the account through which the redeemption of AUM will occur
     * @param receiver_ Receiver of the redeemed funds
     * @param shares_ OZL balance to redeem
     */
    function withdrawUserShare(
        AccountConfig calldata accountDetails_,
        address receiver_,
        uint shares_
    ) external;

}