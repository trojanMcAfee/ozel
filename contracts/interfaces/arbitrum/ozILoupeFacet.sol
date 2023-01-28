// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;



interface ozILoupeFacet {

    /// @dev Checks if token_ exists in database
    function queryTokenDatabase(address token_) external view returns(bool);

    /**
     * @dev Gets the Ozel Index, which is the heart of the rebasing and equilibrium 
     * mechanisms, that keep OZL's totalSupply pegged to 100, and in direct relation to each
     * user's L1 ETH transfers made to their account(s)
     */
    function getOzelIndex() external view returns(uint);

    /**
     * @notice Gets the regulator counter in order to see the stability of the
     * rebase machnism compared to the maximum uint256 number. 
     * @dev Increases by one, and it increase is one iteration of the equilibrium mechanism within
     * the rebase. 
     * @return uint Current iteration. 
     */
    function getRegulatorCounter() external view returns(uint);

    /**
     * @dev Gets the user's share from AUM in WETH and USD.
     * @param user_ Queried user
     * @return tuple User's share from AUM in WETH and USD
     */
    function getOzelBalances(address user_) external view returns(uint, uint);

    /**
     * @dev Gets the total volume that has flowed into the system from L1 ETH transfers. 
     * @return uint Total volume in ETH
     */
    function getTotalVolumeInETH() external view returns(uint);

    /**
     * @dev Same as above but in USD
     * @return uint Total volume in USD
     */
    function getTotalVolumeInUSD() external view returns(uint);

    /**
     * @dev External version of _getAUM()
     * @param price_ Current ETHUSD price feed (Chainlink)
     */
    function getAUM(int price_) external view returns(uint yBalance, uint valueUM);

    /**
     * @notice Gets the protocol's fee
     * @return uint256 The protocol's fee expressed in base units
     */
    function getProtocolFee() external view returns(uint);

    /**
     * @notice Gets the slippage used in non-user swaps
     * @return uint256 Slippage of non-user swaps
     */
    function getDefaultSlippage() external view returns(uint);

    /**
     * @notice Checks if the entry call on exchangeToAccountToken has to check for an L1 address
     * @return bool If the check needs to be done or not
     */
    function getL1CheckStatus() external view returns(bool);

    /**
     * @notice Get the total amount of ETH sent to an Account
     * @return uint256 ETH amount
     */
    function getAccountPayments(address account_) external view returns(uint);

    /**
     * @notice Gets the owner of an Account
     * @param account_ The Account
     * @return address The address of the owner
     */
    function getUserByL1Account(address account_) external view returns(address);
}