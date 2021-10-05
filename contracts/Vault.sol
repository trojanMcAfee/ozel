//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import 'hardhat/console.sol';



contract Vault {

    IERC20 renBTC = IERC20(0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D);

    function getBalanceVault() public view {
        console.log('acumulated fee in renBTC: ', renBTC.balanceOf(address(this)));
    }


}