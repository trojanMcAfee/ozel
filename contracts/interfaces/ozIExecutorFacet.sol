// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;



interface ozIExecutorFacet {


    /**
     * @notice Final swap
     * @dev Exchanges the amount using the account's slippage.
     * If it fails, it doubles the slippage, divides the amount between two and tries again.
     * If none works, sends the swap's baseToken instead to the user.
     * @param swapDetails_ Struct containing the swap configuration depending on the
     * relation of the account's stablecoin and its Curve pool.
     * @param accountSlippage_ Slippage of the account
     * @param user_ Owner of the account where the emergency transfers will occur in case 
     * any of the swaps can't be completed due to slippage.
     * @param lockNum_ Index of the bit which authorizes the function call
     */
    function executeFinalTrade( 
        TradeOps calldata swapDetails_, 
        uint accountSlippage_,
        address user_,
        uint lockNum_
    ) external payable;

    /**
     * @dev Updates the two main variables that will be used on the calculation
     * of the Ozel Index.
     * @param amount_ ETH (WETH internally) sent to the account (after fee discount)
     * @param user_ Owner of the account
     * @param lockNum_ Index of the bit which authorizes the function call
     */
    function updateExecutorState(
        uint amount_, 
        address user_,
        uint lockNum_
    ) external payable;



}