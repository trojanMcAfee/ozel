//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


struct SwapData {
   uint8 tokenIndex;
   uint256 amountOutMin;
   uint256 deadLine; 
}


interface IL1_ETH_Bridge {
    function sendToL2(
        uint256 chainId,
        address recipient,
        uint256 amount,
        uint256 amountOutMin,
        uint256 deadline,
        address relayer,
        uint256 relayerFee
    )
        external
        payable;
}