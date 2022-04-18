// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../ArbRetryableTx.sol';


contract Test {

    ArbRetryableTx retry = ArbRetryableTx(0x000000000000000000000000000000000000006E);

    function getTO(uint _req) external view returns(uint) {
        bytes32 txId = keccak256(keccak256(421611, _req), uint(0));
        uint num = retry.getTimeout(txId);
        return num;
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