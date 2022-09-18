// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14;

import './StorageBeacon.sol';


contract FakeOZL {

    address public user;
    address receiver;

    constructor(address receiver_) {
        receiver = receiver_;
    }

    receive() external payable {}

    function exchangeToUserToken(StorageBeacon.UserConfig memory userDetails_) external payable {
        if (address(this).balance > 0) {
            (bool success, ) = receiver.call{value: address(this).balance}(""); 
            require(success, 'ETH sent failed');
        }
        user = userDetails_.user;
    } 
}