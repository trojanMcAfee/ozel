//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './interfaces/IGatewayRegistry.sol';
import './interfaces/IGateway.sol';
import './interfaces/IERC20.sol';


contract BTCminter {

    IGatewayRegistry public registry;

    event Deposit(uint amount, bytes msg);
    event Withdrawal(bytes _to, uint256 _amount, bytes _msg);

    constructor(address _registry) {
        registry = IGatewayRegistry(_registry);
    }


    function deposit(
        bytes calldata _msg,
        uint _amount,
        bytes32 _nHash,
        bytes calldata _sig
    ) external {
        bytes32 pHash = keccak256(abi.encode(_msg));
        IGateway BTCGateway = registry.getGatewayBySymbol('BTC');
        BTCGateway.mint(pHash, _amount, _nHash, _sig);
        emit Deposit(_amount, _msg);
    }

    function withdraw(bytes calldata _msg, bytes calldata _to, uint256 _amount) external {
        uint256 burnedAmount = registry.getGatewayBySymbol("BTC").burn(_to, _amount);
        emit Withdrawal(_to, burnedAmount, _msg);
    }


    function balance() external view returns(uint) {
        return registry.getTokenBySymbol('BTC').balanceOf(address(this));
    }



}