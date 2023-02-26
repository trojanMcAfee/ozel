// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;



interface ozIMiddlewareL2 {

    /**
     * @notice For forwarding the bridging call from ozPayme
     * @dev It uses the same function name as on OZLFacet for simplicity in data handling
     * @param accData_ Details of the Account to forward to interact with
     * @param amountToSend_ ETH amount that account_ received
     * @param account_ Account
     */
    function exchangeToAccountToken(
        bytes memory accData_,
        uint amountToSend_,
        address account_
    ) external payable;


     /**
     * @notice Changes the token of the account 
     * @dev Changes the stablecoin being swapped into at the end of the L2 flow.
     * @param newToken_ New account stablecoin
     */
    function changeToken(address newToken_) external;

    /**
     * @notice Changes the slippage of the account
     * @dev Changes the slippage used on each L2 swap for the account.
     * @param newSlippage_ New account slippage represented in basis points
     */
    function changeSlippage(uint16 newSlippage_) external;

    /**
     * @dev Changes both the slippage and token of an account
     * @param newToken_ New account stablecoin
     * @param newSlippage_ New account slippage represented in basis points
     */
    function changeTokenNSlippage(address newToken_, uint16 newSlippage_) external;

    /**
     * @dev Gets the account/proxy details.
     * @return user Address of the user who created the account
     * @return token Token of the Account
     * @return slippage Slippage of the Account 
     */
    function getDetails() external view returns(
        address user, 
        address token, 
        uint16 slippage
    );

    /**
     * @notice Withdraws ETH as failsafe mechanism
     * @dev Allows the owner of the account to withdraw any ETH, at any point, from the account in case
     * of catastrophic failure of any part of the components of the Gelato execution.
     */
    function withdrawETH_lastResort() external;

}