// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../ethereum/StorageBeacon.sol';
// import { LibDiamond } from "./LibDiamond.sol";
import '../arbitrum/AppStorage.sol';


library ozERC20Lib {

    event FailedERCFunds(address indexed user_, uint indexed amount_);

    function getAppStorage() internal pure returns(AppStorage storage s) {
        assembly {
            s.slot := 0
        }
    }

    /**
        Ethereum side
     */
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


    /**
        Arbitrum side
     */
    function ozApprove(
        IERC20 token_, 
        address spender_, 
        address user_, 
        uint amount_
        // mapping(address => mapping(IERC20 => uint)) storage userToFailedERC_
    ) internal returns(bool success) {
        success = token_.approve(spender_, amount_);
        if (!success) _handleFalse(user_, token_, amount_);
    }

    function _handleFalse(
        address user_, 
        IERC20 token_, 
        uint amount_
        // mapping(address => mapping(IERC20 => uint)) storage userToFailedERC_
    ) private {
        AppStorage storage s = getAppStorage();
        s.userToFailedERC[user_][token_] = amount_;
        emit FailedERCFunds(user_, amount_);
        // StorageBeacon(storage_).setFailedERCFunds(user_, token_, amount_);
    }
}
