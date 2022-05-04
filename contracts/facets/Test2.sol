// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


contract Test2 {

    address public user;

    struct userConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }

    receive() external payable {}


    function exchangeToUserToken(userConfig memory userDetails_) external payable {
        address x = 0x0E743a1E37D691D8e52F7036375F3D148B4116ba;

        if (address(this).balance > 0) {
            (bool success, ) = x.call{value: address(this).balance}(""); //msg.value
            require(success, 'ETH sent failed');
        }

        user = userDetails_.user;
    } 


}