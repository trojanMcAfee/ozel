//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '../../AppStorage.sol';
import '../../facets/ExecutorFacet.sol';
import {ITri} from '../../../interfaces/ICurve.sol';
import '../../../interfaces/IWETH.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';


contract SwapsForUserTokenV2 {

    AppStorage s;

    event ForTesting(uint indexed testNum);
    
    
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

            //Testing variable
            uint testVar = i == 1 ? type(uint).max : slippage;
            
            try ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_ / i, testVar, false) { 
                if (i == 2) {
                    try ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_ / i, slippage, false) {
                        emit ForTesting(23);
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
        
        // uint baseBalance = IERC20(baseTokenOut_ == 0 ? s.USDT : s.WBTC).balanceOf(address(this));

        // // Delegates trade execution
        // if ((userDetails_.userToken != s.USDT && userDetails_.userToken != s.WBTC) && baseBalance > 0) { //userToken_ != s.USDT || userToken_ != s.WBTC
        //     _tradeWithExecutor(userDetails_.userToken, userDetails_.userSlippage); 
        // }
    }
}



contract SwapsForUserTokenV3 {

    AppStorage s;

    event ForTesting(uint indexed testNum);


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

            //Testing variables
            uint testVar = i == 1 ? type(uint).max : slippage;
            uint testVar2 = type(uint).max;
            
            try ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_ / i, testVar, false) { 
                if (i == 2) {
                    try ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_ / i, testVar2, false) {
                        break;
                    } catch {
                        IWETH(s.WETH).transfer(userDetails_.user, amountIn_ / 2); 
                        emit ForTesting(23);
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
        
        // uint baseBalance = IERC20(baseTokenOut_ == 0 ? s.USDT : s.WBTC).balanceOf(address(this));

        // // Delegates trade execution
        // if ((userDetails_.userToken != s.USDT && userDetails_.userToken != s.WBTC) && baseBalance > 0) { //userToken_ != s.USDT || userToken_ != s.WBTC
        //     _tradeWithExecutor(userDetails_.userToken, userDetails_.userSlippage); 
        // }
    }
}