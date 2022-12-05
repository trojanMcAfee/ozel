// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;



interface ozILoupeFacet {

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
}