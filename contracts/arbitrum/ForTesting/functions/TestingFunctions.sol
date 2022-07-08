//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../../AppStorage.sol';
import '../../facets/ExecutorFacet.sol';
import {ITri} from '../../../interfaces/ICurve.sol';
import '../../../interfaces/IWETH.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../../Modifiers.sol';
import '../../facets/oz4626Facet.sol';
import '../../facets/ExecutorFacet.sol';
import '../../../libraries/SafeTransferLib.sol'; //use the @ from solmate




contract SwapsForUserTokenV2 is Modifiers {

    using SafeTransferLib for IERC20;

    event ForTesting(uint indexed testNum);

    function exchangeToUserToken(
        userConfig memory userDetails_
    ) external payable noReentrancy(0) filterDetails(userDetails_) { 
        if (msg.value <= 0) revert CantBeZero('msg.value');

        //Queries if there are failed fees. If true, it deposits them
        // if (s.failedFees > 0) _depositInDeFi(s.failedFees, true);

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
        (uint netAmountIn, ) = _getFee(wethIn);

        uint baseTokenOut = 
            userDetails_.userToken == s.WBTC || userDetails_.userToken == s.renBTC ? 1 : 0;

        //Swaps WETH to userToken (Base: USDT-WBTC / Route: MIM-USDC-renBTC-WBTC) 
        _swapsForUserToken(
            netAmountIn, baseTokenOut, userDetails_
        );
      
        //Sends userToken to user
        uint toUser = IERC20(userDetails_.userToken).balanceOf(address(this));
        if (toUser > 0) IERC20(userDetails_.userToken).safeTransfer(userDetails_.user, toUser);

        // _depositInDeFi(fee, false);
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

    function _getFee(uint amount_) private view returns(uint, uint) {
        uint fee = amount_ - ExecutorFacet(s.executor).calculateSlippage(amount_, s.dappFee);
        uint netAmount = amount_ - fee;
        return (netAmount, fee);
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