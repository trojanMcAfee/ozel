//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import './Manager.sol';

import 'hardhat/console.sol';


contract PayToken is ERC20 {


    uint flag = 0;
    // address public manager;
    Manager manager;


    constructor(address _manager) ERC20('PayToken', 'PYY') {
        // manager = _manager;
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

    // event Index(uint indexed x);
    // function getHello(uint x) public {
    //     console.log('the number: ', x);
    //     emit Index(x);
    // }


    function setNewBalance(uint _index, address _user, uint _userNewAmount) external override {
        // uint x = (_index * _userNewAmount * 100) / 10 ** 8;
        // super._mint(_user, x);
        // console.log('this is x: ', x);
        _balances[_user] = (_index * _userNewAmount * 100) / 10 ** 8;
        // console.log('PYY balance on PYY: ', super.balanceOf(_user));
        // console.log('holaaaaa');
    }

    function balanceOf(address account) public view override returns (uint256) {
        uint index = manager.distributionIndex();
        uint userPayments = manager.usersPayments(account);
        return (index * userPayments * 100 ) / 10 ** 8;
    }
}