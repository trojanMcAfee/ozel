//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {ITricrypto} from './interfaces/ICurve.sol';
import './libraries/Helpers.sol';
import './interfaces/ICrvLpToken.sol';

import 'hardhat/console.sol';


contract Vault {

    using Helpers for uint256;

    IERC20 renBTC = IERC20(0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D);
    IERC20 WBTC = IERC20(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);
    ITricrypto tricrypto = ITricrypto(0xD51a44d3FaE010294C616388b506AcdA1bfAAE46);
    ICrvLpToken crvTricrypto = ICrvLpToken(0xc4AD29ba4B3c580e6D59105FFf484999997675Ff);
    
    uint slippageOnCurve = 100; //bp: 100 -> 1%


    function getTokenBalance(address _token) public view returns(uint balance) {
        balance = IERC20(_token).balanceOf(address(this));
    }

    function _calculateTokenAmountCurve(uint _wbtcAmountIn) private returns(uint, uint[3] memory) {
        uint[3] memory amounts;
        amounts[0] = 0;
        amounts[1] = _wbtcAmountIn;
        amounts[2] = 0;
        uint tokenAmount = tricrypto.calc_token_amount(amounts, true);
        return(tokenAmount, amounts);
    }

    function depositInCurve() public {
        uint wbtcAmountIn = WBTC.balanceOf(address(this));
        (uint tokenAmountIn, uint[3] memory amounts) = _calculateTokenAmountCurve(wbtcAmountIn);
        uint minAmount = tokenAmountIn._calculateSlippage(slippageOnCurve);
        WBTC.approve(address(tricrypto), tokenAmountIn);
        tricrypto.add_liquidity(amounts, minAmount);
        console.log('crv USD-BTC-ETH token balance: ', crvTricrypto.balanceOf(address(this)));
    }

} 
