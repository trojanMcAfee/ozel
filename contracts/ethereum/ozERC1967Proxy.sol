// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14; 


import '@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol';
import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';

//Proxy from ProxyFactory
contract ozERC1967Proxy is ReentrancyGuard, ERC1967Proxy {
    constructor(address logic_, bytes memory data_) ERC1967Proxy(logic_, data_) {}
}