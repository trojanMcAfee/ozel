//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';



contract ozERC1967Proxy is ERC1967Proxy {

    address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    struct UserConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }

    address beacon;
    address storageBeacon;

    constructor(
        address beacon_,
        address storageBeacon_,
        address logic_,
        bytes memory data_
    ) ERC1967Proxy(logic_, data_) {
        beacon = beacon_;
        storageBeacon = storageBeacon_;
    }

}