//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';


contract PayMe {

    IERC20 pBTC = IERC20(0x5228a22e72ccC52d415EcFd199F99D0665E7733b);


function getBalance(address _user) public view returns(uint) {
    return pBTC.balanceOf(_user);
}


}