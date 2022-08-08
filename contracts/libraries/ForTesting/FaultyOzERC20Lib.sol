// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../../ethereum/StorageBeacon.sol';

import 'hardhat/console.sol';


library FaultyOzERC20Lib {

    event FailedERCFunds(address indexed user_, uint indexed amount_);
    event SecondAttempt(uint success);

    // bytes32 constant ozERC20_SLOT = keccak256('ozerc20.storage.slot');

    struct ozERC20Storage {
        address storageBeacon; 
    }


    // function getLibStorage() internal pure returns (ozERC20Storage storage oz) {
    //     bytes32 position = ozERC20_SLOT;
    //     assembly {
    //         oz.slot := position
    //     }
    // }

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

    function ozTransfer(
        IERC20 token_, 
        address user_, 
        uint amount_,
        address storage_
    ) internal {
        bool success = false; //bool success = token_.transfer(user_, amount_);
        if (!success) _handleFalse(user_, token_, amount_, storage_);
    }

    function _handleFalse(
        address user_, 
        IERC20 token_, 
        uint amount_, 
        address storage_
    ) private {
        // ozERC20Storage storage oz = getLibStorage();
        StorageBeacon(storage_).setFailedERCFunds(user_, token_, amount_);
        emit SecondAttempt(23);
        emit FailedERCFunds(user_, amount_);
    }
}
