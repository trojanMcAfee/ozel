// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../ethereum/StorageBeacon.sol';
import '../libraries/LibCommon.sol';
import '../libraries/AddressAliasHelper.sol';
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

    modifier onlyAuthorized() {
        address aliasAddr = AddressAliasHelper.applyL1ToL2Alias(msg.sender);
        if (!s.isAuthorized[aliasAddr]) revert NotAuthorized(msg.sender);
        _;
    }

    /**
     * @dev Does primery checks on the details of an account
     * @param data_ Details of account/proxy
     */
    function _filter(bytes memory data_) internal view returns(address, address, uint) {
        (address user, address token, uint16 slippage) = LibCommon.extract(data_);

        if (user == address(0) || token == address(0)) revert CantBeZero('address'); 
        if (slippage <= 0) revert CantBeZero('slippage');

        if (!s.tokenDatabase[token] && _l1TokenCheck(token)) {
            revert TokenNotInDatabase(token);
        } else if (!s.tokenDatabase[token]) {
            token = s.tokenL1ToTokenL2[token];
        }

        return (user, token, uint(slippage));
    }

    function _l1TokenCheck(address token_) internal view returns(bool) {
        if (s.l1Check) {
            if (s.tokenL1ToTokenL2[token_] == s.nullAddress) return true;
            return false;
        } else {
            return true;
        }
    }
}
