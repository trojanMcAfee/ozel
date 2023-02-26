// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import { AccountConfig } from '../../arbitrum/AppStorage.sol';


interface ozIProxyFactoryFacet {

    /**
     * @notice Creator the user account and its correspondant Gelato task
     * @dev Creates the proxy where users get their ETH sent to, and calls for 
     * the generation of the Gelato task for each one.
     * @param acc_ Account details attached to each user
     */
    function createNewProxy(AccountConfig calldata acc_) external;

    /**
     * @dev Authorizes functions that cann call exchangeToAccountToken
     * @param selector_ Selector to authorize
     * @param status_ New status of selector
     */
    function authorizeSelector(bytes4 selector_, bool status_) external;
}