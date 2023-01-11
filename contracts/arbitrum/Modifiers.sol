// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../ethereum/StorageBeacon.sol';
import './AppStorage.sol';
import './Bits.sol';
import '../Errors.sol';


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
     * @param acc_ Details of account/proxy
     */
    modifier filterDetails(AccountConfig memory acc_) {
        if (!s.tokenDatabase[acc_.token] && _l1TokenCheck(acc_.token)) revert TokenNotInDatabase(acc_.token);
        if (acc_.user == address(0) || acc_.token == address(0)) revert CantBeZero('address'); 
        if (acc_.slippage <= 0) revert CantBeZero('slippage');
        if (bytes(acc_.name).length == 0) revert CantBeZero('name'); 
        if (bytes(acc_.name).length > 18) revert NameTooLong();
        _;
    }

    function _l1TokenCheck(address token_) private returns(bool) {
        if (s.l1Check) {
            if (s.tokenL1ToTokenL2[token_] == s.nullAddress) return true;
            return false;
        } else {
            return true;
        }
    }
}
