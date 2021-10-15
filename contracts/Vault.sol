//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IRenPool} from './interfaces/ICurve.sol';
import './libraries/Helpers.sol';
import './interfaces/ICrvLpToken.sol';

import 'hardhat/console.sol';


contract Vault {

    using Helpers for uint256;

    IERC20 renBTC = IERC20(0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D);
    IERC20 WBTC = IERC20(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);
    IRenPool renPool = IRenPool(0x93054188d876f558f4a66B2EF1d97d16eDf0895B);
    ICrvLpToken crvRenWBTC = ICrvLpToken(0x49849C98ae39Fff122806C06791Fa73784FB3675);
    
    uint slippageOnCurve = 100; //bp: 100 -> 1%


    function getTokenBalance(address _token) public view returns(uint balance) {
        balance = IERC20(_token).balanceOf(address(this));
    }

    function _calculateTokenAmountCurve(uint _wbtcAmountIn) private returns(uint, uint[2] memory) {
        uint[2] memory amounts;
        amounts[0] = 0;
        amounts[1] = _wbtcAmountIn;
        uint tokenAmount = renPool.calc_token_amount(amounts, true);
        return(tokenAmount, amounts);
    }

    function depositInCurve() public {
        uint wbtcAmountIn = WBTC.balanceOf(address(this));
        (uint tokenAmountIn, uint[2] memory amounts) = _calculateTokenAmountCurve(wbtcAmountIn);
        uint minAmount = tokenAmountIn._calculateSlippage(slippageOnCurve);
        WBTC.approve(address(renPool), tokenAmountIn);
        renPool.add_liquidity(amounts, minAmount);
        console.log('crvRenWBTC balance: ', crvRenWBTC.balanceOf(address(this)));
    }

} 
