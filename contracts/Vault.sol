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
    IERC20 USDT = IERC20(0xdAC17F958D2ee523a2206206994597C13D831ec7);
    IERC20 WETH = IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);


    
    uint slippageOnCurve = 100; //bp: 100 -> 1%

    /**
    BTC: 1 / USDT: 0 / WETH: 2
     */



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
        console.log('WBTC fees to be deposited in Curve: ', wbtcAmountIn);
        (uint tokenAmountIn, uint[3] memory amounts) = _calculateTokenAmountCurve(wbtcAmountIn);
        uint minAmount = tokenAmountIn._calculateSlippage(slippageOnCurve);

        WBTC.approve(address(tricrypto), tokenAmountIn);
        tricrypto.add_liquidity(amounts, minAmount);
        console.log('crvTricrypto token balance: ', crvTricrypto.balanceOf(address(this)));
    }

    function getTotalInUSD() public view returns(uint total) {
        uint virtualPrice = tricrypto.get_virtual_price();
        total = virtualPrice * crvTricrypto.balanceOf(address(this)); //divide between 10 ** 36 to get USD
    }

    /***** Put it in Vault.sol *****/
    // function withdrawUserShare(address _user, address _userToken) public {
        // remove_liquidity_one_coin(uint256 token_amount, uint256 i, uint256 min_amount)
    // }

    function withdrawUserShare(uint _user, uint _userAllocation, address _userToken) public {
        uint vaultBalance = crvTricrypto.balanceOf(address(this));
        uint userShareTokens = ((_userAllocation * vaultBalance) / 100 * 1 ether) / 10 ** 36;
        int128 i;
        uint y;
        if (_userToken == address(USDT)) {
            i = 0;
            y = 0;
        } else if (_userToken == address(WBTC)) {
            i = 1;
            y = 1;
        } else if (_userToken == address(WETH)) {
            i = 2;
            y = 2;
        }
        uint tokenAmountIn = tricrypto.calc_withdraw_one_coin(userShareTokens, i);
        uint minAmount = tokenAmountIn._calculateSlippage(slippageOnCurve);
        tricrypto.remove_liquidity_one_coin(userShareTokens, y, minAmount);
        uint x = IERC20(_userToken).balanceOf(address(this));
        console.log('x: ', x); //withdrawing user's share in USDT from Curve
 
    }
    /**************************/

    

} 

