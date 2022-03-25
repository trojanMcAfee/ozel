//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


interface IRen {
    function exchange(
      int128 i,
      int128 j,
      uint256 dx,
      uint256 min_dy
    ) external;

    function get_dy(int128 i, int128 j, uint256 dx) external returns(uint256);
}

interface I2crv {
  function exchange(
      int128 i,
      int128 j,
      uint256 dx,
      uint256 min_dy
    ) external returns(uint256);

    function get_dy(int128 i, int128 j, uint256 dx) external returns(uint256);
    function calc_withdraw_one_coin(uint256 token_amount, int128 i) external returns(uint256);
    function remove_liquidity_one_coin(uint256 token_amount, int128 i, uint256 min_amount) external;
    function calc_token_amount(uint256[2] calldata amounts, bool deposit) external returns(uint256);
    function add_liquidity(uint256[2] calldata amounts, uint256 min_mint_amount) external;
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
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
  function remove_liquidity_one_coin(uint256 token_amount, uint256 i, uint256 min_amount) external;
  function calc_withdraw_one_coin(uint256 token_amount, uint256 i) external returns(uint256);
}

interface IMIM {
  function exchange_underlying(
    int128 i,
    int128 j,
    uint256 dx,
    uint256 min_dy
  ) external returns (uint256);

  function exchange(
    int128 i,
    int128 j,
    uint256 dx,
    uint256 min_dy
  ) external returns (uint256);

  function get_dy(int128 i, int128 j, uint dx) external returns(uint256);
  function get_dy_underlying(int128 i, int128 j, uint dx) external returns(uint256);
  function calc_withdraw_one_coin(uint256 token_amount, int128 i) external returns(uint256);
  function remove_liquidity_one_coin(uint256 token_amount, int128 i, uint256 min_amount) external;
}


interface IFrax {
  function exchange_underlying(
    int128 i,
    int128 j,
    uint256 dx,
    uint256 min_dy
  ) external returns (uint256);

  function get_dy_underlying(int128 i, int128 j, uint dx) external returns(uint256);
}

