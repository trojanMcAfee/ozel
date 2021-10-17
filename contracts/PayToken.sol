//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

import 'hardhat/console.sol';


contract PayToken is ERC20 {
    constructor(address _manager) ERC20('PayToken', 'PYY', _manager) {
        _mint(_manager, 100 * 1 ether);
    }

    uint flag = 0;

    function _beforeTokenTransfer(
        address from, 
        address to, 
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);

        console.log('token flag: ', flag);
        flag++;
    }
}