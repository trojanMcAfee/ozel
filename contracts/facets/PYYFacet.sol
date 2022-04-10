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
    WBTC: 1 / USDT: 0 / WETH: 2
     */

     /*******
        State changing functions
     ******/

    function exchangeToUserToken(address user_, address userToken_) external payable {
        uint baseTokenOut;
        uint failedFees = IWETH(s.WETH).balanceOf(address(this));
        console.log('failedFees ^^^^^: ', failedFees);

        IWETH(s.WETH).deposit{value: msg.value}();
        uint wethIn = IWETH(s.WETH).balanceOf(address(this)) - failedFees;

        //Deposits in ERC4626
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
        if (toUser > 0) IERC20(userToken_).safeTransfer(user_, toUser);
        
        //Deposits fees in Curve and Yearn
        // failedFees > 0 ?
        //     depositCurveYearn(fee + failedFees) :
        //     depositCurveYearn(fee);

        if (failedFees > 0) {
            console.log('fee + failedFees: ', fee + failedFees);
            depositCurveYearn(fee + failedFees);
        } else {
            console.log('fee in exechangeUserToken: ', fee);
            depositCurveYearn(fee);
        }
    }




    function swapsForUserToken(
        uint amountIn_, 
        uint baseTokenOut_, 
        address userToken_
    ) public payable { 
        for (uint i=1; i <= 5; i++) {
            uint minOut = ITri(s.tricrypto).get_dy(2, baseTokenOut_, amountIn_);
            uint slippage = ExecutorF(s.executor).calculateSlippage(minOut, s.slippageTradingCurve * i);
            IWETH(s.WETH).approve(s.tricrypto, amountIn_);
            
            try ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_, slippage, false) {
                break;
            } catch {
                if (i != 5) {
                    continue;
                } else {
                    IWETH(s.WETH).transfer(msg.sender, amountIn_); 
                }
            }
        }
        
        uint baseBalance = IERC20(baseTokenOut_ == 0 ? s.USDT : s.WBTC).balanceOf(address(this));

        // Delegates trade execution
        if ((userToken_ != s.USDT || userToken_ != s.WBTC) && baseBalance > 0) {
            _tradeWithExecutor(userToken_); 
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
        _tradeWithExecutor(userToken_);

        uint userTokens = IERC20(userToken_).balanceOf(address(this));
        user_ == receiver_ ?
           IERC20(userToken_).safeTransfer(user_, userTokens) :
           IERC20(userToken_).safeTransfer(receiver_, userTokens); 
    } 
    

    function depositCurveYearn(uint fee_) public payable { 
        console.log('fee_: ', fee_);
        //Deposit WETH in Curve Tricrypto pool
        (uint tokenAmountIn, uint[3] memory amounts) = _calculateTokenAmountCurve(fee_);
        IWETH(s.WETH).approve(s.tricrypto, tokenAmountIn);
        for (uint i=1; i <= 5; i++) {
            console.log('tokenAmountIn: ', tokenAmountIn);
            uint minAmount = ExecutorF(s.executor).calculateSlippage(tokenAmountIn, s.slippageOnCurve * 1);

            // minAmount = msg.sender == 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 ? minAmount : type(uint).max;
            console.log('msg.sender: ', msg.sender);
            console.log('minAmount: ', minAmount);
            console.log('WETH balance before adding to Curve %%%%%%: ', IWETH(s.WETH).balanceOf(address(this)));
            console.log('WETH allowance: ', IWETH(s.WETH).allowance(msg.sender, s.tricrypto));
            console.log('WETH allowance (address(this)): ', IWETH(s.WETH).allowance(address(this)));

            try ITri(s.tricrypto).add_liquidity(amounts, minAmount) {
                console.log('WETH balance after adding to Curve %%%%%%: ', IWETH(s.WETH).balanceOf(address(this)));
                //Deposit crvTricrypto in Yearn
                IERC20(s.crvTricrypto).approve(s.yTriPool, IERC20(s.crvTricrypto).balanceOf(address(this)));
                IYtri(s.yTriPool).deposit(IERC20(s.crvTricrypto).balanceOf(address(this)));
            } catch {
                console.log('went here');
                if (i != 5) {
                    continue;
                }
            }
        }

        //Deposit crvTricrypto in Yearn
        // IERC20(s.crvTricrypto).approve(s.yTriPool, IERC20(s.crvTricrypto).balanceOf(address(this)));
        // IYtri(s.yTriPool).deposit(IERC20(s.crvTricrypto).balanceOf(address(this)));

        //there's one fee batch missing: WETH balance after before to Curve %%%:  100000000000000000 / fee + failedFees:  200000000000000000
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

    function _tradeWithExecutor(address userToken_) public {
        for (uint i=0; i < s.swaps.length; i++) {
            if (s.swaps[i].userToken == userToken_) {
                (bool success, ) = s.executor.delegatecall(
                    abi.encodeWithSelector(
                        ExecutorF(s.executor).executeFinalTrade.selector, 
                        s.swaps[i]
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





