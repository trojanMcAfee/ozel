// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import './arbitrum/AppStorage.sol';
import './Errors.sol';
import './arbitrum/Bits.sol';
import './ethereum/StorageBeacon.sol';

import 'hardhat/console.sol';



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

    modifier filterDetails(UserConfig memory userDetails_) {
        if (userDetails_.user == address(0) || userDetails_.userToken == address(0)) revert CantBeZero('address'); 
        if (userDetails_.userSlippage <= 0) revert CantBeZero('slippage');
        if (!s.tokenDatabase[userDetails_.userToken]) revert TokenNotInDatabase(userDetails_.userToken);
        _;
    }
}


abstract contract ModifiersETH {

    // StorageBeacon.UserConfig userDetails;
    // StorageBeacon.FixedConfig fxConfig;

    // modifier onlyOps() {
    //     if (msg.sender != fxConfig.ops) revert NotAuthorized(msg.sender);
    //     _;
    // }

    // modifier onlyUser() {
    //     if (msg.sender != userDetails.user) revert NotAuthorized(msg.sender);
    //     _;
    // }    
}