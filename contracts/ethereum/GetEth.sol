// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;

import 'hardhat/console.sol';

contract GetEth {

    address immutable owner;

    modifier onlyOwner() {
        require(msg.sender == owner, 'Not owner');
        _;
    }

    constructor(address owner_) {
        owner = owner_;
    }

    
    function getFunds() external onlyOwner {
        (bool success, ) = payable(owner).call{value: address(this).balance}("");
        require(success);
    }


}