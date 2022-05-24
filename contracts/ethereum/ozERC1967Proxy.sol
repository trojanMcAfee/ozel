//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';


contract ozERC1967Proxy is ReentrancyGuard, ERC1967Proxy {
    constructor(address logic_, bytes memory data_) ERC1967Proxy(logic_, data_) {}
}