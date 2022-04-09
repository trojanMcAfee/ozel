//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../interfaces/ICrvLpToken.sol';
import '../interfaces/IWETH.sol';
import './ExecutorF.sol';
import './pyERC4626/pyERC4626.sol';
import '../interfaces/IYtri.sol';
import {ITri} from '../interfaces/ICurve.sol';

import 'hardhat/console.sol';

import '../AppStorage.sol';
import './ExecutorF.sol';

import '../libraries/SafeTransferLib.sol';




contract PYYFacet { 

    AppStorage s;

    using SafeTransferLib for IERC20;



    /**
    BTC: 1 / USDT: 0 / WETH: 2
     */

     /*******
        State changing functions
     ******/

    function exchangeToUserToken(address user_, address userToken_) external payable {
        uint baseTokenOut;

        IWETH(s.WETH).deposit{value: msg.value}();
        uint wethIn = IWETH(s.WETH).balanceOf(address(this));

        //deposits in ERC4626
        (bool success, ) = s.py46.delegatecall(
            abi.encodeWithSelector(
                pyERC4626(s.py46).deposit.selector, 
                wethIn, user_
            )
        );
        require(success, 'PYYFacet: Failed to deposit');

        if (userToken_ == s.WBTC || userToken_ == s.renBTC) {
            baseTokenOut = 1;
        } else {
            baseTokenOut = 0;
        }

        //Sends fee to Vault contract
        (uint netAmountIn, uint fee) = _getFee(wethIn);
        
        //Swaps WETH to userToken (Base: USDT-WBTC / Route: MIM-USDC-renBTC-WBTC)  
        swapsForUserToken(netAmountIn, baseTokenOut, userToken_);
      
        //Sends userToken to user
        uint toUser = IERC20(userToken_).balanceOf(address(this));
        IERC20(userToken_).safeTransfer(user_, toUser);
        
        //Deposits fees in Curve's renPool
        depositCurveYearn(fee);
    }

    function swapsForUserToken(
        uint amountIn_, 
        uint baseTokenOut_, 
        address userToken_
    ) public payable { 
        uint minOut = ITri(s.tricrypto).get_dy(2, baseTokenOut_, amountIn_);
        console.log(1);
        console.log('s.slippageTradingCurve: ', s.slippageTradingCurve / 1 ether);
        console.log('minOut: ', minOut);
        uint slippage = ExecutorF(s.executor).calculateSlippage(minOut, s.slippageTradingCurve);
        console.log('slippage: ', slippage);
        console.log(2);
        IWETH(s.WETH).approve(s.tricrypto, amountIn_);
        ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_, amountIn_, false); //2, baseTokenOut_, amountIn_, slippage, false - try with the functions without slippage

        //Delegates trade execution
        if (userToken_ != s.USDT || userToken_ != s.WBTC) {
            _callExecutor(userToken_); 
        }
    }


    function withdrawUserShare(
        address user_, 
        address receiver_,
        uint shares_, 
        address userToken_
    ) public { 
        (bool success, bytes memory data) = s.py46.delegatecall(
            abi.encodeWithSelector(
                pyERC4626(s.py46).redeem.selector, 
                shares_, receiver_, user_
            )
        );
        require(success, 'PYYFacet: withdrawUserShare() failed');
        uint assets = abi.decode(data, (uint));
        IYtri(s.yTriPool).withdraw(assets);

        //tricrypto= USDT: 0 / crv2- USDT: 1 , USDC: 0 / mim- MIM: 0 , CRV2lp: 1
        uint tokenAmountIn = ITri(s.tricrypto).calc_withdraw_one_coin(assets, 0); 
        uint minOut = ExecutorF(s.executor).calculateSlippage(tokenAmountIn, s.slippageOnCurve);
        ITri(s.tricrypto).remove_liquidity_one_coin(assets, 0, minOut);

        //Delegates trade execution
        _callExecutor(userToken_);

        uint userTokens = IERC20(userToken_).balanceOf(address(this));
        user_ == receiver_ ?
           IERC20(userToken_).safeTransfer(user_, userTokens) :
           IERC20(userToken_).safeTransfer(receiver_, userTokens); 
    } 
    

    function depositCurveYearn(uint fee_) public payable {
        //Deposit WETH in Curve Tricrypto pool
        (uint tokenAmountIn, uint[3] memory amounts) = _calculateTokenAmountCurve(fee_);
        uint minAmount = ExecutorF(s.executor).calculateSlippage(tokenAmountIn, s.slippageOnCurve);
        IWETH(s.WETH).approve(s.tricrypto, tokenAmountIn);
        ITri(s.tricrypto).add_liquidity(amounts, minAmount);

        //Deposit crvTricrypto in Yearn
        IERC20(s.crvTricrypto).approve(s.yTriPool, IERC20(s.crvTricrypto).balanceOf(address(this)));
        IYtri(s.yTriPool).deposit(IERC20(s.crvTricrypto).balanceOf(address(this)));
    }


    /*******
        Helper functions
     ******/
     


    function _getFee(uint amount_) public returns(uint, uint) {
        uint fee = amount_ - ExecutorF(s.executor).calculateSlippage(amount_, s.dappFee);
        s.feesVault += fee;
        uint netAmount = IWETH(s.WETH).balanceOf(address(this)) - fee;
        return (netAmount, fee);
    }

    function _callExecutor(address userToken_) private {
        for (uint i=0; i < s.swaps.length; i++) {
            if (s.swaps[i].userToken == userToken_) {
                (bool success, ) = s.executor.delegatecall(
                    abi.encodeWithSelector(
                        ExecutorF(s.executor).executeFinalTrade.selector, 
                        s.swaps[i]
                    )
                );
                require(success, 'PYYFacet: _callExecutor() failed');
                break;
            }
        }
    }

    function _calculateTokenAmountCurve(uint wethAmountIn_) private returns(uint, uint[3] memory) {
        uint[3] memory amounts;
        amounts[0] = 0;
        amounts[1] = 0;
        amounts[2] = wethAmountIn_;
        uint tokenAmount = ITri(s.tricrypto).calc_token_amount(amounts, true);
        return (tokenAmount, amounts);
    }

   

    

}





