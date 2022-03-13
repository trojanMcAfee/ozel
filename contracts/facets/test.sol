// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../ArbRetryableTx.sol';


contract Test {

    ArbRetryableTx y = ArbRetryableTx(0x000000000000000000000000000000000000006E);


    function getTO(uint _req) external view returns(uint) {
        bytes32 x = keccak256(abi.encodePacked(_req, uint(0)));
        uint id = y.getTimeout(x);
        return id;
    }



}