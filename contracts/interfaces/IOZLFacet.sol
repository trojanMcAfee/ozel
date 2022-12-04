// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import { AccountConfig, TradeOps } from '../arbitrum/AppStorage.sol';


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

    /**
     * @dev Adds a new token to be swapped into to the token database
     * @param newSwap_ Swap Curve config -as infra- that will allow swapping into the new token
     */
    function addTokenToDatabase(TradeOps memory newSwap_) external;

    /**
     * @dev Removes a token from the token database
     * @param swapToRemove_ Remove the swap Curve config that allows swapping into
     * the soon-to-be-removed token.
     */
    function removeTokenFromDatabase(TradeOps memory swapToRemove_) external;
}