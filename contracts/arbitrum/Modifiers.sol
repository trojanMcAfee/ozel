// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;


// import { LibDiamond } from "../libraries/LibDiamond.sol";
import './AppStorage.sol';
import '../Errors.sol';


abstract contract Modifiers {

    AppStorage s;

    modifier noReentrancy(uint lockNum_) {
        require(!(s.isLocked[lockNum_]), "No reentrance");
        s.isLocked[lockNum_] = true;
        _;
        s.isLocked[lockNum_] = false;
    }

    modifier noReentrancy2(uint index_) {
        require(!(_getBit(0, index_)), 'No reentrance');
        _toggleBit(0, index_);
        _;
        _toggleBit(0, index_);
    }


    modifier isAuthorized(uint lockNum_) {
        require(s.isAuth[lockNum_], "Not authorized");
        _;
        s.isAuth[lockNum_] = false;
    }


    modifier onlyWhenEnabled() {
        require(s.isEnabled, 'Operation not enabled');
        _;
    }

    modifier filterDetails(UserConfig memory userDetails_) {
        if (userDetails_.user == address(0) || userDetails_.userToken == address(0)) revert CantBeZero('address'); 
        if (userDetails_.userSlippage <= 0) revert CantBeZero('slippage');
        if (!s.tokenDatabase[userDetails_.userToken]) revert NotFoundInDatabase('token');
        _;
    }

    /**
        Bits manipulation
     */

    function _getBit(uint bitmap_, uint index_) private view returns(bool) {
        uint bit = s.bitLocks[bitmap_] & (1 << index_);
        return bit > 0;
    }

    function _toggleBit(uint bitmap_, uint index_) private view {
        s.bitLocks[bitmap_] ^ uint(1) << index_;
    }

}