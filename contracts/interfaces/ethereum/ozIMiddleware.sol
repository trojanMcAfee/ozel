// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;




interface ozIMiddleware {

    /**
     * @dev For forwarding the bridging call from ozPayme
     * @param gasPriceBid_ L2's gas price
     * @param dataForL2_ Details of the Account to forward to L2
     * @param amountToSend_ ETH amount that account_ received
     * @param account_ Account
     * @return (bool,bool,address) Values to check back in ozPayme
     */
    function forwardCall(
        uint gasPriceBid_,
        bytes memory dataForL2_,
        uint amountToSend_,
        address account_
    ) external payable returns(bool, bool, address);
}