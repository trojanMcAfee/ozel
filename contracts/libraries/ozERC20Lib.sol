// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../ethereum/StorageBeacon.sol';


library ozERC20Lib {

    event FailedERCFunds(address indexed user_, uint indexed amount_);

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
        bool success = token_.transfer(user_, amount_);
        if (!success) _handleFalse(user_, token_, amount_, storage_);
    }

    function _handleFalse(
        address user_, 
        IERC20 token_, 
        uint amount_, 
        address storage_
    ) private {
        emit FailedERCFunds(user_, amount_);
        StorageBeacon(storage_).setFailedERCFunds(user_, token_, amount_);
    }
}
