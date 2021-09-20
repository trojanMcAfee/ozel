//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


interface IRenPool {
    function exchange(
      int128 i,
      int128 j,
      uint256 dx,
      uint256 min_dy
    ) external;
}


interface ITricrypto {
  function exchange(
    int128 i,
    int128 j,
    uint256 dx,
    uint256 min_dy,
    bool use_eth
  ) external;
}