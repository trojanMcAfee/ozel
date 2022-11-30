// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;



interface ozI20Facet {

    /**
     * @notice Queries OZL balance
     * @dev Rebase mechanism pegged to the token's total supply (100)  
     * @param user_ account to be queried
     * @return uint OZL balance of user_
     */
    function balanceOf(address user_) public view returns (uint);


}