// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;


import './AppStorage.sol';
import 'hardhat/console.sol';

abstract contract Bits {

    AppStorage s;

    function _getBit(uint bitmap_, uint index_) internal view returns(bool) {
        uint bit = s.bitLocks[bitmap_] & (1 << index_);
        return bit > 0;
    }

    function _toggleBit(uint bitmap_, uint index_) internal {
        // console.log('');
        s.bitLocks[bitmap_] ^= (1 << index_);
    }
}