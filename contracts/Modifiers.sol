// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import './ethereum/StorageBeacon.sol';
import './arbitrum/AppStorage.sol';
import './arbitrum/Bits.sol';
import './Errors.sol';



/**
 * @title Modifiers for the L2 contracts
 */
abstract contract ModifiersARB is Bits {

    /**
     * @dev Protector against reentrancy using bitmaps and bitwise operations
     * @param index_ Index of the bit to be flipped 
     */
    modifier noReentrancy(uint index_) { 
        if (!(_getBit(0, index_))) revert NoReentrance();
        _toggleBit(0, index_);
        _;
        _toggleBit(0, index_);
    }

    /**
     * @dev Access control using bitmaps and bitwise operations
     * @param index_ Index of the bit to be flipped 
     */
    modifier isAuthorized(uint index_) {
        if (_getBit(1, index_)) revert NotAuthorized(msg.sender);
        _;
        _toggleBit(1, index_);
    }

    /**
     * @dev Allows/disallows redeemptions of OZL for AUM 
     */
    modifier onlyWhenEnabled() {
        if (!(s.isEnabled)) revert NotEnabled();
        _;
    }

    /**
     * @dev Does primery checks on the details of an account
     * @param accountDetails_ Details of account/proxy
     */
    modifier filterDetails(AccountConfig memory accountDetails_) {
        if (accountDetails_.user == address(0) || accountDetails_.token == address(0)) revert CantBeZero('address'); 
        if (accountDetails_.slippage <= 0) revert CantBeZero('slippage');
        if (bytes(accountDetails_.name).length == 0) revert CantBeZero('name'); 
        if (bytes(accountDetails_.name).length > 18) revert NameTooLong();
        if (!s.tokenDatabase[accountDetails_.token]) revert TokenNotInDatabase(accountDetails_.token);
        _;
    }
}
