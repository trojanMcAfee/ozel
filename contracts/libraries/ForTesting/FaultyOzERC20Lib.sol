// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../../ethereum/StorageBeacon.sol';

import 'hardhat/console.sol';


library FaultyOzERC20Lib {

    event FailedERCFunds(address indexed user_, uint indexed amount_);
    event SecondAttempt(uint success);

    bytes32 constant ozERC20_SLOT = keccak256('ozerc20.storage.slot');

    struct ozERC20Storage {
        address storageBeacon; 
    }


    function getLibStorage() internal pure returns (ozERC20Storage storage oz) {
        bytes32 position = ozERC20_SLOT;
        assembly {
            oz.slot := position
        }
    }

    function ozApprove(
        IERC20 token_, 
        address spender_, 
        address user_, 
        uint amount_
    ) internal returns(bool success) {
        success = token_.approve(spender_, amount_);
        if (!success) _handleFalse(user_, token_, amount_);
    }

    function ozTransfer(
        IERC20 token_, 
        address user_, 
        uint amount_
    ) internal {
        console.log(1);
        bool success = false; //bool success = token_.transfer(user_, amount_);
        if (!success) _handleFalse(user_, token_, amount_);
    }

    function _handleFalse(address user_, IERC20 token_, uint amount_) private {
        console.log(2);
        ozERC20Storage storage oz = getLibStorage();
        console.log('oz.sBeacon2: ', oz.storageBeacon);
        console.log(3);
        console.log('emitter status: ', StorageBeacon(oz.storageBeacon).getEmitterStatus());
        StorageBeacon(oz.storageBeacon).setFailedERCFunds(user_, token_, amount_);
        console.log(4);
        emit SecondAttempt(23);
        emit FailedERCFunds(user_, amount_);
    }
}
