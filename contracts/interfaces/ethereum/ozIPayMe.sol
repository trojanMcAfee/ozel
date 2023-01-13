// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import './IStorageBeacon.sol';


interface ozIPayMe {

    /**
     * @notice Send ETH and calldata to L2
     * @dev Sends the ETH the user received in their account plus its swap details as calldata to
     * the contract on L2. In case it fails, it swaps the ETH for the emergency stablecoin using Uniswap on L1.
     * @param gasPriceBid_ L2's gas price
     * @param accountDetails_ User configuration for swaps on L2
     * @param amountToSend_ Gross ETH amount being sent to L1
     */
    function sendToArb( 
        uint gasPriceBid_,
        IStorageBeacon.AccountConfig calldata accountDetails_,
        uint amountToSend_
    ) external payable;

    /// @dev Initializes the user account when being created in ProxyFactory.sol
    // function initialize(
    //     IStorageBeacon.AccountConfig calldata accountDetails_, 
    //     address beacon_
    // ) external;

    /**
     * @notice Changes the token of the account 
     * @dev Changes the stablecoin being swapped into at the end of the L2 flow.
     * @param newToken_ New account stablecoin
     */
    function changeAccountToken(address newToken_) external;

    /**
     * @notice Changes the slippage of the account
     * @dev Changes the slippage used on each L2 swap for the account.
     * @param newSlippage_ New account slippage represented in basis points
     */
    function changeAccountSlippage(uint newSlippage_) external;

    /**
     * @dev Changes both the slippage and token of an account
     * @param newToken_ New account stablecoin
     * @param newSlippage_ New account slippage represented in basis points
     */
    function changeAccountTokenNSlippage(address newToken_, uint newSlippage_) external;

    /**
     * @dev Gets the account/proxy details.
     * @return AccountConfig Struct containing the account details (user, token, slippage, name)
     */
    function getAccountDetails() external view returns(IStorageBeacon.AccountConfig memory);

    /**
     * @notice Withdraws ETH as failsafe mechanism
     * @dev Allows the owner of the account to withdraw any ETH, at any point, from the account in case
     * of catastrophic failure of any part of the components of the L1 contracts that don't allow 
     * bridging to L2.
     */
    function withdrawETH_lastResort() external;
}