// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../ethereum/StorageBeacon.sol';

interface IProxyFactory {

    /**
     * @notice Creator the user account and Gelato task
     * @dev Creates the proxy where users get their ETH sent to, and calls for 
     * the generates the Gelato task for each account
     * @param userDetails_ Account details attached to each user
     */
    function createNewProxy(
        StorageBeacon.UserConfig calldata userDetails_
    ) external returns(address);
}