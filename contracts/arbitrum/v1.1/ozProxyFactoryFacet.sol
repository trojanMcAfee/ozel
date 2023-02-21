// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@openzeppelin/contracts/utils/Address.sol";
import { ModifiersARB } from '../Modifiers.sol';
import '../../interfaces/ethereum/IOps.sol';
import './ozAccountL2.sol';
import { AccountConfig, AccData } from '../AppStorage.sol';
import '../../Errors.sol';

import 'hardhat/console.sol';

contract ozProxyFactoryFacet is ModifiersARB {

    address private immutable ops;
    address private immutable ozMiddleware;

    event AccountCreated(address indexed account);

    constructor(address ops_, address ozMiddleware_) {
        ops = ops_;
        ozMiddleware = ozMiddleware_;
    }


    function createNewProxy(
        AccountConfig calldata acc_
    ) external noReentrancy(0) {
        bytes calldata name = bytes(acc_.name);
        address token = acc_.token;

        if (name.length == 0) revert CantBeZero('name'); 
        if (name.length > 18) revert NameTooLong();
        if (acc_.user == address(0) || token == address(0)) revert CantBeZero('address');
        if (acc_.slippage < 1 || acc_.slippage > 500) revert CantBeZero('slippage');
        if (!s.tokenDatabase[token]) revert TokenNotInDatabase(token);

        // console.log('address(this): ', address(this));

        ozAccountL2 newAccount = new ozAccountL2(ozMiddleware, ops);

        bytes2 slippage = bytes2(uint16(acc_.slippage));
        bytes memory accData = bytes.concat(bytes20(acc_.user), bytes20(acc_.token), slippage);
    
        bytes memory createData = abi.encodeWithSignature(
            'initialize(bytes)',
            accData
        );
        Address.functionCall(address(newAccount), createData);
        //-----
        // bytes memory idData = abi.encodeWithSignature('_startTask(address)', address(newAccount));
        // bytes memory returnData = Address.functionCall(address(this), idData);
        // bytes32 id = abi.decode(returnData, (bytes32));
        //-----

        bytes32 id = _startTask(address(newAccount));

        _multiSave(bytes20(address(newAccount)), acc_, id);

        emit AccountCreated(address(newAccount));
    }


    //------

    function _startTask(address account_) private returns(bytes32 id) { 
        console.log('sender: ', msg.sender);
        console.log('address(this): ', address(this));
        
        id = IOps(ops).createTaskNoPrepayment( 
            account_, //account_
            bytes4(abi.encodeWithSignature('exchangeToAccountToken(bytes,uint256,address)')),
            account_,
            abi.encodeWithSignature('checker()'),
            s.ETH
        );
    }

    function _multiSave(
        bytes20 account_,
        AccountConfig calldata acc_,
        bytes32 taskId_
    ) private { 
        address user = acc_.user;
        bytes32 acc_user = bytes32(bytes.concat(account_, bytes12(bytes20(user))));
        bytes memory task_name = bytes.concat(taskId_, bytes32(bytes(acc_.name)));

        if (s.userToData[user].accounts.length == 0) {
            AccData storage data = s.userToData[user];
            data.accounts.push(address(account_));
            data.acc_userToTask_name[acc_user] = task_name;
        } else {
            s.userToData[user].accounts.push(address(account_));
            s.userToData[user].acc_userToTask_name[acc_user] = task_name;
        }
    }

}