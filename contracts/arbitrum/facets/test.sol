// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../../interfaces/ArbRetryableTx.sol';


contract Test {

    ArbRetryableTx retry = ArbRetryableTx(0x000000000000000000000000000000000000006E);

    function getTO(uint req_) external view returns(uint, bytes32) {
        bytes32 txId = keccak256(abi.encode(keccak256(abi.encode(4, req_)), uint(0)));
        uint num = retry.getTimeout(txId);
        return (num, txId);
    }


}



//withPacked:

// contract Test {

//     ArbRetryableTx retry = ArbRetryableTx(0x000000000000000000000000000000000000006E);

//     function getTO(uint _req) external view returns(uint) {
//         bytes32 txId = keccak256(abi.encodePacked(_req, uint(0)));
//         uint num = retry.getTimeout(txId);
//         return num;
//     }
// }

//withoutPacked:

// contract Test {

//     ArbRetryableTx retry = ArbRetryableTx(0x000000000000000000000000000000000000006E);

//     function getTO(uint _req) external view returns(uint) {
//         bytes32 txId = keccak256(abi.encode(_req, uint(0)));
//         uint num = retry.getTimeout(txId);
//         return num;
//     }


// }