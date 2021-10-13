//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


interface IRenPool {
    function exchange(
      int128 i,
      int128 j,
      uint256 dx,
      uint256 min_dy
    ) external;

    function add_liquidity(uint256[2] calldata amounts, uint256 min_mint_amount) external;
}


interface ITricrypto {
  function exchange(
    uint256 i,
    uint256 j,
    uint256 dx,
    uint256 min_dy,
    bool use_eth
  ) external payable;

  function get_dy(uint i, uint j, uint dx) external returns(uint256);
}