// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import './IStorageBeacon.sol';


interface ozIPayMe {

    /**
     * @notice Send ETH and calldata to L2
     * @dev Sends the ETH the user received in their account plus their swap details as calldata to
     * the contract on L2. In case it fails, it swaps the ETH for the emergency stablecoin using Uniswap on L1.
     * @param gasPriceBid_ L2's gas price
     * @param userDetails_ User configuration for swaps on L2
     */
    function sendToArb( 
        uint gasPriceBid_,
        IStorageBeacon.UserConfig calldata userDetails_
    ) external payable;


    /// @dev Initializes each user Proxy (aka account) when being created in ProxyFactory.sol
    function initialize(
        IStorageBeacon.UserConfig calldata userDetails_, 
        address beacon_
    ) external;


    /**
     * @notice Changes the token of the account 
     * @dev Changes the stablecoin being swapped into at the end of the L2 flow.
     * @param newUserToken_ New account stablecoin
     */
    function changeUserToken(address newUserToken_) external;


    /**
     * @notice Changes the slippage of the account
     * @dev Changes the slippage used on each L2 swap that finishes with the account stablecoin.
     * @param newSlippage_ New account slippage represented in basis points
     */
    function changeUserSlippage(uint newSlippage_) external;


    /**
     * @notice Changes the slippage and token of the account
     * @dev Changes both the slippage and token in one function
     * @param newUserToken_ New account stablecoin
     * @param newSlippage_ New account slippage represented in basis points
     */
    function changeUserTokenNSlippage(address newUserToken_, uint newSlippage_) external;

    /**
     * @dev Gets the account (aka proxy) details.
     *      In the context of the L1 contracts, it's the account details and not user details.
     *      Naming convention is preserve to keep a standard for activity on L2 contracts.
     * @return UserConfig Struct containing the account details (user, userToken, userSlippage, accountName)
     */
    function getUserDetails() external view returns(IStorageBeacon.UserConfig memory);

    /**
     * @notice Withdraws ETH as failsafe mechanism
     * @dev Allows the owner of the account to withdraw any ETH, at any point, from the account in case
     * of catastrophic failure of any part of the components of the L1 contracts that don't allow 
     * the bridging to L2.
     */
    function withdrawETH_lastResort() external;
}