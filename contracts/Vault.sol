//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';


contract Vault {

    IERC20 renBTC = IERC20(0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D);

    function getRenBalance() public view returns(uint balance) {
        balance = renBTC.balanceOf(address(this));
    }

}
