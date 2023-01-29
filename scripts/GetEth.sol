// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;



contract GetEth {

    address payable owner = '0xC486c3013241cC11fc05B2e023BA74E12758Cec5';

    modifier onlyOwner() {
        require(msg.sender == owner, 'Not owner');
        _;
    }

    
    function getFunds() external onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}();
        require(success);
    }


}