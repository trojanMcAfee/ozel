//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './IERC20.sol';
import './IGateway.sol';


interface IGatewayRegistry {
    function getGatewayBySymbol(string calldata _tokenSymbol) external view returns (IGateway);
    function getTokenBySymbol(string calldata _tokenSymbol) external view returns (IERC20);
}