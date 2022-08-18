// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../../ethereum/StorageBeacon.sol';
import '../../Errors.sol';

import 'hardhat/console.sol';


library FaultyOzERC20Lib {

    event FailedERCFunds(address indexed user_, uint indexed amount_);
    event SecondAttempt(uint success);


    function ozApprove(
        IERC20 token_, 
        address spender_, 
        address user_, 
        uint amount_,
        address storage_
    ) internal returns(bool success) {
        success = token_.approve(spender_, amount_);
        if (!success) _handleFalse(user_, token_, amount_, storage_);
    }

    //'bool success = false' was initially 'bool success = token_.transfer(user_, amount_);'
    function ozTransfer(
        IERC20 token_, 
        address user_, 
        uint amount_,
        address storage_
    ) internal {
        console.log(1);
        bool success = false; 
        if (!success) _handleFalse(user_, token_, amount_, storage_);
    }

    function _handleFalse(
        address user_, 
        IERC20 token_, 
        uint amount_, 
        address storage_
    ) private {
        console.log(2);
        console.log('address(this) on lib: ', address(this));

        bytes memory data = abi.encodeWithSelector(
            StorageBeacon(storage_).setFailedERCFunds.selector,
            user_, token_, amount_
        );
        (bool success, ) = storage_.delegatecall(data);
        if(!success) revert CallFailed('FaultyOzERC20Lib: _handleFalse() failed');
        // StorageBeacon(storage_).setFailedERCFunds(user_, token_, amount_);

        console.log(3);
        emit SecondAttempt(23);
        emit FailedERCFunds(user_, amount_);
    }
}
