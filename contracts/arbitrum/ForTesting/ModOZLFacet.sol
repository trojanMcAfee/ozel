//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../../interfaces/ICrvLpToken.sol';
import '../../interfaces/IWETH.sol';
import '../facets/ExecutorFacet.sol';
import '../facets/oz4626Facet.sol';
import '../../interfaces/IYtri.sol';
import {ITri} from '../../interfaces/ICurve.sol';
import { LibDiamond } from "../../libraries/LibDiamond.sol";

import 'hardhat/console.sol';

import '../AppStorage.sol';

import '../../libraries/SafeTransferLib.sol';
import '../../Errors.sol';
import '../Modifiers.sol';


contract ModOZLFacet is Modifiers { 

    using SafeTransferLib for IERC20;

    /**
    WBTC: 1 / USDT: 0 / WETH: 2
     */

     /*******
        State changing functions
     ******/    

    function exchangeToUserToken(
        userConfig memory userDetails_
    ) external payable noReentrancy(0) filterDetails(userDetails_) { 
        if (msg.value <= 0) revert CantBeZero('msg.value');

        //Queries if there are failed fees. If true, it deposits them
        if (s.failedFees > 0) _depositInDeFi(s.failedFees, true);

        IWETH(s.WETH).deposit{value: msg.value}();
        uint wethIn = IWETH(s.WETH).balanceOf(address(this));
        wethIn = s.failedFees == 0 ? wethIn : wethIn - s.failedFees;

        //Deposits in oz4626Facet
        s.isAuth[0] = true;

        (bool success, ) = s.oz46.delegatecall(
            abi.encodeWithSelector(
                oz4626Facet(s.oz46).deposit.selector, 
                wethIn, userDetails_.user, 0
            )
        );
        if(!success) revert CallFailed('OZLFacet: Failed to deposit');

        //Sends fee to Vault contract
        (uint netAmountIn, uint fee) = _getFee(wethIn);

        uint baseTokenOut = 
            userDetails_.userToken == s.WBTC || userDetails_.userToken == s.renBTC ? 1 : 0;

        //Swaps WETH to userToken (Base: USDT-WBTC / Route: MIM-USDC-renBTC-WBTC) 
        _swapsForUserToken(
            netAmountIn, baseTokenOut, userDetails_
        );
      
        //Sends userToken to user
        uint toUser = IERC20(userDetails_.userToken).balanceOf(address(this));
        if (toUser > 0) IERC20(userDetails_.userToken).safeTransfer(userDetails_.user, toUser);

        _depositInDeFi(fee, false);
    }




    function _swapsForUserToken(
        uint amountIn_, 
        uint baseTokenOut_, 
        userConfig memory userDetails_
    ) private { 
        IWETH(s.WETH).approve(s.tricrypto, amountIn_);

        /**** 
            Exchanges the amount between the user's slippage. 
            If it fails, it doubles the slippage, divides the amount between two and tries again.
            If none works, sends the WETH back to the user.
        ****/ 
        for (uint i=1; i <= 2; i++) {
            uint minOut = ITri(s.tricrypto).get_dy(2, baseTokenOut_, amountIn_ / i);
            uint slippage = ExecutorFacet(s.executor).calculateSlippage(minOut, userDetails_.userSlippage * i);
            
            try ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_ / i, type(uint).max, false) { 
                if (i == 2) {
                    try ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_ / i, slippage, false) {
                        break;
                    } catch {
                        IWETH(s.WETH).transfer(userDetails_.user, amountIn_ / 2); 
                        break;
                    }
                }
                break;
            } catch {
                if (i == 1) {
                    continue;
                } else {
                    IWETH(s.WETH).transfer(userDetails_.user, amountIn_); 
                }
            }
        }
        
        uint baseBalance = IERC20(baseTokenOut_ == 0 ? s.USDT : s.WBTC).balanceOf(address(this));

        // Delegates trade execution
        if ((userDetails_.userToken != s.USDT && userDetails_.userToken != s.WBTC) && baseBalance > 0) {
            _tradeWithExecutor(userDetails_.userToken, userDetails_.userSlippage); 
        }
    }

    

    function withdrawUserShare(
        userConfig memory userDetails_,
        address receiver_,
        uint shares_
    ) external onlyWhenEnabled filterDetails(userDetails_) { 
        if (receiver_ == address(0)) revert CantBeZero('address');
        if (shares_ <= 0) revert CantBeZero('shares');

        //Queries if there are failed fees. If true, it deposits them
        if (s.failedFees > 0) _depositInDeFi(s.failedFees, true);

        s.isAuth[3] = true;

        (bool success, bytes memory data) = s.oz46.delegatecall(
            abi.encodeWithSelector(
                oz4626Facet(s.oz46).redeem.selector, 
                shares_, receiver_, userDetails_.user, 3
            )
        );
        if(!success) revert CallFailed('OZLFacet: Failed to deposit');

        uint assets = abi.decode(data, (uint));
        IYtri(s.yTriPool).withdraw(assets);

        //tricrypto= USDT: 0 / crv2- USDT: 1 , USDC: 0 / mim- MIM: 0 , CRV2lp: 1
        uint tokenAmountIn = ITri(s.tricrypto).calc_withdraw_one_coin(assets, 0); 
        
        //If tx reverts due to slippage, user can re-submit a new one
        uint minOut = ExecutorFacet(s.executor).calculateSlippage(
            tokenAmountIn, userDetails_.userSlippage
        ); 
        ITri(s.tricrypto).remove_liquidity_one_coin(assets, 0, minOut);

        _tradeWithExecutor(userDetails_.userToken, userDetails_.userSlippage);

        uint userTokens = IERC20(userDetails_.userToken).balanceOf(address(this));
        IERC20(userDetails_.userToken).safeTransfer(receiver_, userTokens); 
    } 
    

    function _depositInDeFi(uint fee_, bool isRetry_) private {
        //Deposit WETH in Curve Tricrypto pool
        (uint tokenAmountIn, uint[3] memory amounts) = _calculateTokenAmountCurve(fee_);
        IWETH(s.WETH).approve(s.tricrypto, tokenAmountIn);

        for (uint i=1; i <= 2; i++) {
            uint minAmount = ExecutorFacet(s.executor).calculateSlippage(tokenAmountIn, s.defaultSlippage * i);

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


    function addTokenToDatabase(address newToken_) external { 
        LibDiamond.enforceIsContractOwner();
        s.tokenDatabase[newToken_] = true;
    }


    /*******
        Helper functions
     ******/

    function _getFee(uint amount_) private view returns(uint, uint) {
        uint fee = amount_ - ExecutorFacet(s.executor).calculateSlippage(amount_, s.dappFee);
        uint netAmount = amount_ - fee;
        return (netAmount, fee);
    }

    function _tradeWithExecutor(address userToken_, uint userSlippage_) private {
        s.isAuth[2] = true;
        uint length = s.swaps.length;

        for (uint i=0; i < length;) {
            if (s.swaps[i].userToken == userToken_) {
                (bool success, ) = s.executor.delegatecall(
                    abi.encodeWithSelector(
                        ExecutorFacet(s.executor).executeFinalTrade.selector, 
                        s.swaps[i], userSlippage_, 2
                    )
                );
                if(!success) revert CallFailed('OZLFacet: _tradeWithExecutor() failed');
                break;
            }
            unchecked { ++i; }
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





