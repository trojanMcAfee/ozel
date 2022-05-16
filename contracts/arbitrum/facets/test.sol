// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../../interfaces/ArbRetryableTx.sol';

import 'hardhat/console.sol';


contract Test {

    ArbRetryableTx retry = ArbRetryableTx(0x000000000000000000000000000000000000006E);

    function getTO(uint req_) external view returns(uint, bytes32) {
        bytes32 txId = keccak256(abi.encode(keccak256(abi.encode(4, req_)), uint(0)));
        uint num = retry.getTimeout(txId);
        return (num, txId);
    }

    function getHello(
        address a, 
        uint b, 
        uint c, 
        address d,
        address e,
        uint f,
        uint g,
        bytes calldata data
    ) external payable {
        console.log('hi');
        // console.log('address(this): ', address(this));
        console.log('msg.value: ', msg.value);

        console.log('a: ', a);
        console.log('b: ', b);
        console.log('c: ', c);
        console.log('d: ', d);
        console.log('e: ', e);
        console.log('f: ', f);
        console.log('g: ', g);
        console.logBytes(data);
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