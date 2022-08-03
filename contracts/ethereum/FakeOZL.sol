// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './StorageBeacon.sol';


contract FakeOZL {

    address public user;

    receive() external payable {}


    function exchangeToUserToken(StorageBeacon.UserConfig memory userDetails_) external payable {
        address x = 0x2B75D8312cA463Dea9E80981b5c690f15E94Bd55; //0x1cc12A3437B42bf100002d26da383C1b911F2B38

        if (address(this).balance > 0) {
            (bool success, ) = x.call{value: address(this).balance}(""); 
            require(success, 'ETH sent failed');
        }

        user = userDetails_.user;
    } 


}