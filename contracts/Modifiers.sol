// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import './ethereum/StorageBeacon.sol';
import './arbitrum/AppStorage.sol';
import './arbitrum/Bits.sol';
import './Errors.sol';

// import 'hardhat/console.sol';



abstract contract ModifiersARB is Bits {

    modifier noReentrancy(uint index_) { 
        if (!(_getBit(0, index_))) revert NoReentrance();
        _toggleBit(0, index_);
        _;
        _toggleBit(0, index_);
    }

    modifier isAuthorized(uint index_) {
        if (_getBit(1, index_)) revert NotAuthorized(msg.sender);
        _;
        _toggleBit(1, index_);
    }

    modifier onlyWhenEnabled() {
        if (!(s.isEnabled)) revert NotEnabled();
        _;
    }

    modifier filterDetails(AccountConfig memory accountDetails_) {
        if (accountDetails_.user == address(0) || accountDetails_.userToken == address(0)) revert CantBeZero('address'); 
        if (accountDetails_.userSlippage <= 0) revert CantBeZero('slippage');
        if (!s.tokenDatabase[accountDetails_.userToken]) revert TokenNotInDatabase(accountDetails_.userToken);
        _;
    }
}
