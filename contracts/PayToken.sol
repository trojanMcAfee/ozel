//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import './Manager.sol';

import 'hardhat/console.sol';


contract PayToken is ERC20 {

    uint flag = 0;
    Manager manager;

    constructor(address _manager) ERC20('PayToken', 'PYY') {
        manager = Manager(_manager);
    }

    // modifier onlyManager {
    //     require(_msgSender() == manager, 'Manager not setting new balance');
    //     _;
    // }


    function _beforeTokenTransfer(
        address from, 
        address to, 
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);

        console.log('token flag: ', flag);
        flag++;
    }


    // function setNewBalance(uint _index, address _user, uint _userNewAmount) external override {
    //     // uint x = (_index * _userNewAmount * 100) / 10 ** 8;
    //     // super._mint(_user, x);
    //     // console.log('this is x: ', x);
    //     _balances[_user] = (_index * _userNewAmount * 100) / 10 ** 8;
    //     // console.log('PYY balance on PYY: ', super.balanceOf(_user));
    //     // console.log('holaaaaa');
    // }

    function balanceOf(address account) public view override returns (uint256) {
        uint index = manager.distributionIndex();
        uint userPayments = manager.usersPayments(account);
        return (index * userPayments * 100 ) / 10 ** 8;
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(sender, recipient, amount);

        uint256 senderBalance = balanceOf(sender);
        console.log('sender: ', senderBalance);
        console.log('amount: ', amount);
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        // unchecked {
            manager.transferUserAllocation(sender, recipient, amount);
        // }

        emit Transfer(sender, recipient, amount);

        _afterTokenTransfer(sender, recipient, amount);
    }

    
}