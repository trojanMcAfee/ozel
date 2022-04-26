//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
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

    using SafeERC20 for IERC20;

    /**
    WBTC: 1 / USDT: 0 / WETH: 2
     */

     /*******
        State changing functions
     ******/    

    function exchangeToUserToken(userConfig memory userDetails_) external payable {
        address user = userDetails_.user;
        address userToken = userDetails_.userToken;
        uint userSlippage = 
            userDetails_.userSlippage > 0 ? userDetails_.userSlippage : s.defaultSlippage;

        //Queries if there are failed fees. If true, it deposits them
        if (s.failedFees > 0) depositCurveYearn(s.failedFees, true);

        IWETH(s.WETH).deposit{value: msg.value}();
        uint wethIn = IWETH(s.WETH).balanceOf(address(this));
        wethIn = s.failedFees == 0 ? wethIn : wethIn - s.failedFees;

        //Deposits in ERC4626
        (bool success, ) = s.py46.delegatecall(
            abi.encodeWithSelector(
                pyERC4626(s.py46).deposit.selector, 
                wethIn, user
            )
        );
        require(success, 'PYYFacet: Failed to deposit');

        //Sends fee to Vault contract
        (uint netAmountIn, uint fee) = _getFee(wethIn);

        uint baseTokenOut = 
            userToken == s.WBTC || userToken == s.renBTC ? 1 : 0;

        //Swaps WETH to userToken (Base: USDT-WBTC / Route: MIM-USDC-renBTC-WBTC) 
        swapsForUserToken(netAmountIn, baseTokenOut, userToken, userSlippage);
      
        //Sends userToken to user
        uint toUser = IERC20(userToken).balanceOf(address(this));
        if (toUser > 0) IERC20(userToken).safeTransfer(user, toUser);

        depositCurveYearn(fee, false);
    }




    function swapsForUserToken(
        uint amountIn_, 
        uint baseTokenOut_, 
        address userToken_,
        uint userSlippage_
    ) public payable { 
        IWETH(s.WETH).approve(s.tricrypto, amountIn_);

        /**** 
            Exchanges the amount between the user's slippage. 
            If it fails, it doubles the slippage, divides the amount between two and tries again.
            If none works, sends the WETH back to the user.
        ****/ 
        for (uint i=1; i <= 2; i++) {
            uint minOut = ITri(s.tricrypto).get_dy(2, baseTokenOut_, amountIn_ / i);
            uint slippage = ExecutorF(s.executor).calculateSlippage(minOut, userSlippage_ * i);
            
            try ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_ / i, slippage, false) {
                if (i == 2) {
                    try ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_ / i, slippage, false) {
                        break;
                    } catch {
                        IWETH(s.WETH).transfer(msg.sender, amountIn_ / 2); 
                    }
                }
                break;
            } catch {
                if (i == 1) {
                    continue;
                } else {
                    IWETH(s.WETH).transfer(msg.sender, amountIn_); 
                }
            }
        }
        
        uint baseBalance = IERC20(baseTokenOut_ == 0 ? s.USDT : s.WBTC).balanceOf(address(this));

        // Delegates trade execution
        if ((userToken_ != s.USDT || userToken_ != s.WBTC) && baseBalance > 0) {
            _tradeWithExecutor(userToken_, userSlippage_); 
        }
    }



    function withdrawUserShare(
        userConfig memory userDetails_,
        address receiver_,
        uint shares_
    ) public { 
        address user = userDetails_.user;
        address userToken = userDetails_.userToken;
        uint userSlippage = 
            userDetails_.userSlippage > 0 ? userDetails_.userSlippage : s.defaultSlippage;

        //Queries if there are failed fees. If true, it deposits them
        if (s.failedFees > 0) depositCurveYearn(s.failedFees, true);

        (bool success, bytes memory data) = s.py46.delegatecall(
            abi.encodeWithSelector(
                pyERC4626(s.py46).redeem.selector, 
                shares_, receiver_, user
            )
        );
        require(success, 'PYYFacet: withdrawUserShare() failed');
        uint assets = abi.decode(data, (uint));
        IYtri(s.yTriPool).withdraw(assets);

        //tricrypto= USDT: 0 / crv2- USDT: 1 , USDC: 0 / mim- MIM: 0 , CRV2lp: 1
        uint tokenAmountIn = ITri(s.tricrypto).calc_withdraw_one_coin(assets, 0); 
        
        //If tx reverts due to slippage, user can re-submit a new one
        uint minOut = ExecutorF(s.executor).calculateSlippage(tokenAmountIn, userSlippage); 
        ITri(s.tricrypto).remove_liquidity_one_coin(assets, 0, minOut);

        //Delegates trade execution
        _tradeWithExecutor(userToken, userSlippage);

        uint userTokens = IERC20(userToken).balanceOf(address(this));
        IERC20(userToken).safeTransfer(receiver_, userTokens); //<------- if it fails again, try safeTransferFrom
    } 
    

    function depositCurveYearn(uint fee_, bool isRetry_) public payable {
        //Deposit WETH in Curve Tricrypto pool
        (uint tokenAmountIn, uint[3] memory amounts) = _calculateTokenAmountCurve(fee_);
        IWETH(s.WETH).approve(s.tricrypto, tokenAmountIn);

        for (uint i=1; i <= 2; i++) {
            uint minAmount = ExecutorF(s.executor).calculateSlippage(tokenAmountIn, s.defaultSlippage * i);

            try ITri(s.tricrypto).add_liquidity(amounts, minAmount) {
                //Deposit crvTricrypto in Yearn
                IERC20(s.crvTricrypto).approve(s.yTriPool, IERC20(s.crvTricrypto).balanceOf(address(this)));
                IYtri(s.yTriPool).deposit(IERC20(s.crvTricrypto).balanceOf(address(this)));

                //Internal fees accounting
                if (s.failedFees > 0) s.failedFees = 0;
                s.feesVault += fee_;
                break;
            } catch {
                if (i == 1) {
                    continue;
                } else {
                    if (!isRetry_) s.failedFees += fee_; 
                }
            }
        }
    }



    /*******
        Helper functions
     ******/
     


    function _getFee(uint amount_) public view returns(uint, uint) {
        uint fee = amount_ - ExecutorF(s.executor).calculateSlippage(amount_, s.dappFee);
        uint netAmount = amount_ - fee;
        return (netAmount, fee);
    }

    function _tradeWithExecutor(address userToken_, uint userSlippage_) public {
        for (uint i=0; i < s.swaps.length; i++) {
            if (s.swaps[i].userToken == userToken_) {
                (bool success, ) = s.executor.delegatecall(
                    abi.encodeWithSelector(
                        ExecutorF(s.executor).executeFinalTrade.selector, 
                        s.swaps[i], userSlippage_
                    )
                );
                require(success, 'PYYFacet: _tradeWithExecutor() failed');
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





