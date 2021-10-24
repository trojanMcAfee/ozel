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
    uint256 i,
    uint256 j,
    uint256 dx,
    uint256 min_dy,
    bool use_eth
  ) external payable;

  function get_virtual_price() external view returns (uint256);
  function get_dy(uint i, uint j, uint dx) external returns(uint256);
  function add_liquidity(uint256[3] calldata amounts, uint256 min_mint_amount) external;
  function calc_token_amount(uint256[3] calldata amounts, bool deposit) external returns(uint256);
  function remove_liquidity_one_coin(uint256 token_amount, uint256 i, uint256 min_amount) external returns(uint256);
  function calc_withdraw_one_coin(uint256 token_amount, int128 i) external returns(uint256);
}