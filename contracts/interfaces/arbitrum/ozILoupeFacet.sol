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
}