// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;



interface ozILoupeFacetV1_1 {

    /**
     * @notice Gets the accounts/proxies created by an user
     * @dev Gets the addresses and names of the accounts
     * @param user_ Address of the user
     * @return address[] Addresses of the accounts
     * @return string[] Names of the accounts
     */
    function getAccountsByUser(
        address user_
    ) external view returns(address[] memory, string[] memory);

    /**
     * @dev Gets the 32-bytes representation of the name of an Account
     * @param user_ The owner of the Account
     * @param account_ Account to get the name of
     * @return bytes32 The 32 bytes of the name
     */
    function getNameBytes(address user_, address account_) external view returns(bytes32);

    /**
     * @dev Queries if a function is authorized for a specific call
     * @param selector_ First 4 bytes to query
     * @return bool If it's authorized or not
     */
    function isSelectorAuthorized(bytes4 selector_) external view returns(bool);
}