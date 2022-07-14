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
import '../../../libraries/FixedPointMathLib.sol'; //same as here ^^^^
import '../../../interfaces/IYtri.sol';

import 'hardhat/console.sol';


contract SecondaryFunctions is Modifiers {
    using FixedPointMathLib for uint;

    function _getFee(uint amount_) internal view returns(uint, uint) {
        uint fee = amount_ - ExecutorFacet(s.executor).calculateSlippage(amount_, s.dappFee);
        uint netAmount = amount_ - fee;
        return (netAmount, fee);
    }

    function _calculateTokenAmountCurve(uint wethAmountIn_) internal returns(uint, uint[3] memory) {
        uint[3] memory amounts;
        amounts[0] = 0;
        amounts[1] = 0;
        amounts[2] = wethAmountIn_;
        uint tokenAmount = ITri(s.tricrypto).calc_token_amount(amounts, true);
        return (tokenAmount, amounts);
    }

    function _formatSignatures(uint path_) internal pure returns(string[] memory) {
        string[] memory signs = new string[](2);
        signs[0] = path_ == 1 ? 'deposit(uint256,address,uint256)' : 'redeem(uint256,address,address,uint256)';
        signs[1] = 'executeFinalTrade((int128,int128,address,address,address),uint256,address,uint256)';
        return signs;
    }

    function calculateSlippage(
        uint amount_, 
        uint basisPoint_
    ) public pure returns(uint minAmountOut) {
        minAmountOut = amount_ - amount_.mulDivDown(basisPoint_, 10000);
    }
}


/**
    SwapsForUserToken()
 */

contract SwapsForUserTokenV1 is SecondaryFunctions { 
    using SafeTransferLib for IERC20;

    event ForTesting(uint indexed testNum);
    event DeadVariables(address variable, bytes4 variable2);

    function exchangeToUserToken(
        userConfig memory userDetails_
    ) external payable noReentrancy(0) filterDetails(userDetails_) { 
        if (msg.value <= 0) revert CantBeZero('msg.value');

        IWETH(s.WETH).deposit{value: msg.value}();
        uint wethIn = IWETH(s.WETH).balanceOf(address(this));
        wethIn = s.failedFees == 0 ? wethIn : wethIn - s.failedFees;

        //Deposits in oz4626Facet
        s.isAuth[0] = true; 
        
        (
            address[] memory facets, bytes4[] memory selectors
        ) = LibDiamond.facetToCall(_formatSignatures(1));

        (bool success, ) = facets[0].delegatecall(
            abi.encodeWithSelector(selectors[0], wethIn, userDetails_.user, 0)
        );
        if(!success) revert CallFailed('OZLFacet: Failed to deposit');

        (uint netAmountIn, ) = _getFee(wethIn);

        uint baseTokenOut = 
            userDetails_.userToken == s.WBTC || userDetails_.userToken == s.renBTC ? 1 : 0;

        //Swaps WETH to userToken (Base: USDT-WBTC / Route: MIM-USDC-renBTC-WBTC) 
        _swapsForUserToken(
            netAmountIn, baseTokenOut, userDetails_, facets[1], selectors[1]
        );
      
        uint toUser = IERC20(userDetails_.userToken).balanceOf(address(this));
        if (toUser > 0) IERC20(userDetails_.userToken).safeTransfer(userDetails_.user, toUser);
    }

    function _swapsForUserToken(
        uint amountIn_, 
        uint baseTokenOut_, 
        userConfig memory userDetails_,
        address facetExecutor_,
        bytes4 execSelector_
    ) private { 
        IWETH(s.WETH).approve(s.tricrypto, amountIn_);
        emit DeadVariables(facetExecutor_, execSelector_);

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
    }
}



contract SwapsForUserTokenV2 is SecondaryFunctions {
    using SafeTransferLib for IERC20;

    event ForTesting(uint indexed testNum);
    event DeadVariables(address variable, bytes4 variable2);

    function exchangeToUserToken(
        userConfig memory userDetails_
    ) external payable noReentrancy(0) filterDetails(userDetails_) { 
        if (msg.value <= 0) revert CantBeZero('msg.value');

        IWETH(s.WETH).deposit{value: msg.value}();
        uint wethIn = IWETH(s.WETH).balanceOf(address(this));
        wethIn = s.failedFees == 0 ? wethIn : wethIn - s.failedFees;

        //Deposits in oz4626Facet
        s.isAuth[0] = true; 
        
        (
            address[] memory facets, bytes4[] memory selectors
        ) = LibDiamond.facetToCall(_formatSignatures(1));

        (bool success, ) = facets[0].delegatecall(
            abi.encodeWithSelector(selectors[0], wethIn, userDetails_.user, 0)
        );
        if(!success) revert CallFailed('OZLFacet: Failed to deposit');

        (uint netAmountIn, ) = _getFee(wethIn);

        uint baseTokenOut = 
            userDetails_.userToken == s.WBTC || userDetails_.userToken == s.renBTC ? 1 : 0;

        //Swaps WETH to userToken (Base: USDT-WBTC / Route: MIM-USDC-renBTC-WBTC) 
        _swapsForUserToken(
            netAmountIn, baseTokenOut, userDetails_, facets[1], selectors[1]
        );
      
        uint toUser = IERC20(userDetails_.userToken).balanceOf(address(this));
        if (toUser > 0) IERC20(userDetails_.userToken).safeTransfer(userDetails_.user, toUser);
    }

    function _swapsForUserToken(
        uint amountIn_, 
        uint baseTokenOut_, 
        userConfig memory userDetails_,
        address facetExecutor_,
        bytes4 execSelector_
    ) private { 
        IWETH(s.WETH).approve(s.tricrypto, amountIn_);
        emit DeadVariables(facetExecutor_, execSelector_);

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
    }
}



contract SwapsForUserTokenV3 is SecondaryFunctions {
    using SafeTransferLib for IERC20;

    event ForTesting(uint indexed testNum);
    event DeadVariables(address variable, bytes4 variable2);

    function exchangeToUserToken(
        userConfig memory userDetails_
    ) external payable noReentrancy(0) filterDetails(userDetails_) { 
        if (msg.value <= 0) revert CantBeZero('msg.value');

        IWETH(s.WETH).deposit{value: msg.value}();
        uint wethIn = IWETH(s.WETH).balanceOf(address(this));
        wethIn = s.failedFees == 0 ? wethIn : wethIn - s.failedFees;

        //Deposits in oz4626Facet
        s.isAuth[0] = true; 
        
        (
            address[] memory facets, bytes4[] memory selectors
        ) = LibDiamond.facetToCall(_formatSignatures(1));

        (bool success, ) = facets[0].delegatecall(
            abi.encodeWithSelector(selectors[0], wethIn, userDetails_.user, 0)
        );
        if(!success) revert CallFailed('OZLFacet: Failed to deposit');

        (uint netAmountIn, ) = _getFee(wethIn);

        uint baseTokenOut = 
            userDetails_.userToken == s.WBTC || userDetails_.userToken == s.renBTC ? 1 : 0;

        //Swaps WETH to userToken (Base: USDT-WBTC / Route: MIM-USDC-renBTC-WBTC) 
        _swapsForUserToken(
            netAmountIn, baseTokenOut, userDetails_, facets[1], selectors[1]
        );
      
        uint toUser = IERC20(userDetails_.userToken).balanceOf(address(this));
        if (toUser > 0) IERC20(userDetails_.userToken).safeTransfer(userDetails_.user, toUser);
    }
    

    function _swapsForUserToken(
        uint amountIn_, 
        uint baseTokenOut_, 
        userConfig memory userDetails_,
        address facetExecutor_,
        bytes4 execSelector_
    ) private { 
        IWETH(s.WETH).approve(s.tricrypto, amountIn_);
        emit DeadVariables(facetExecutor_, execSelector_);

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
    }
}


/**
    UpdateIndex()
 */

contract UpdateIndexV1 is Modifiers {
    using FixedPointMathLib for uint;

    function updateExecutorState(
        uint amount_, 
        address user_,
        uint lockNum_
    ) external payable isAuthorized(lockNum_) noReentrancy(2) {
        s.usersPayments[user_] += amount_;
        s.totalVolume += amount_;
        _updateIndex();
    }


    function _updateIndex() private { 
        uint oneETH = 1 ether; 
        if (s.totalVolume == 100 * oneETH) s.indexFlag = true;

        if (s.indexFlag) { 
            s.ozelIndex = 19984000000000000000;
            s.invariantRegulator = 8;
            s.indexRegulator = 3;
            s.totalVolume = 128200000000000000000000;

            s.usersPayments[0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266] = 32100 * 1 ether;
            s.usersPayments[0x70997970C51812dc3A010C7d01b50e0d17dc79C8] = 32000 * 1 ether;
            s.usersPayments[0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC] = 32000 * 1 ether;
            s.usersPayments[0x90F79bf6EB2c4f870365E785982E1f101E93b906] = 32000 * 1 ether;
            s.indexFlag = false;
        }

       if (s.ozelIndex < 237000 * oneETH && s.ozelIndex != 0) { 
            uint nextInQueueRegulator = s.invariantRegulator * 2;

            if (nextInQueueRegulator <= 16) { 
                s.invariantRegulator = nextInQueueRegulator; 
                s.indexRegulator++; 
            } else {
                s.invariantRegulator /= (16 / 2); 
                s.indexRegulator = 1; 
                s.indexFlag = s.indexFlag ? false : true;
                s.regulatorCounter++; 
            }
        } 

        s.ozelIndex = 
            s.totalVolume != 0 ? 
            oneETH.mulDivDown((s.invariant2 * s.invariantRegulator), s.totalVolume) * (s.invariant * s.invariantRegulator) : 
            0; 

        s.ozelIndex = s.indexFlag ? s.ozelIndex : s.ozelIndex * s.stabilizer;
    }
}


/**
    DepositInDeFi()
 */

contract DepositInDeFiV1 is SecondaryFunctions {
    using SafeTransferLib for IERC20;

    event ForTesting(uint indexed testNum);
    event DeadVariables(address variable, bytes4 variable2);

    function exchangeToUserToken(
        userConfig memory userDetails_
    ) external payable noReentrancy(0) filterDetails(userDetails_) { 
        if (msg.value <= 0) revert CantBeZero('msg.value');

        if (s.failedFees > 0) _depositInDeFi(s.failedFees, true);

        IWETH(s.WETH).deposit{value: msg.value}();
        uint wethIn = IWETH(s.WETH).balanceOf(address(this));
        wethIn = s.failedFees == 0 ? wethIn : wethIn - s.failedFees;

        //Deposits in oz4626Facet
        s.isAuth[0] = true; 
        
        (
            address[] memory facets, bytes4[] memory selectors
        ) = LibDiamond.facetToCall(_formatSignatures(1));

        (bool success, ) = facets[0].delegatecall(
            abi.encodeWithSelector(selectors[0], wethIn, userDetails_.user, 0)
        );
        if(!success) revert CallFailed('OZLFacet: Failed to deposit');

        (uint netAmountIn, uint fee) = _getFee(wethIn);

        uint baseTokenOut = 
            userDetails_.userToken == s.WBTC || userDetails_.userToken == s.renBTC ? 1 : 0;

        //Swaps WETH to userToken (Base: USDT-WBTC / Route: MIM-USDC-renBTC-WBTC) 
        _swapsForUserToken(
            netAmountIn, baseTokenOut, userDetails_, facets[1], selectors[1]
        );
      
        uint toUser = IERC20(userDetails_.userToken).balanceOf(address(this));
        if (toUser > 0) IERC20(userDetails_.userToken).safeTransfer(userDetails_.user, toUser);

        _depositInDeFi(fee, false);
    }


    function _swapsForUserToken(
        uint amountIn_, 
        uint baseTokenOut_, 
        userConfig memory userDetails_,
        address facetExecutor_,
        bytes4 execSelector_
    ) private { 
        IWETH(s.WETH).approve(s.tricrypto, amountIn_);
        emit DeadVariables(facetExecutor_, execSelector_);

        /**** 
            Exchanges the amount between the user's slippage. 
            If it fails, it doubles the slippage, divides the amount between two and tries again.
            If none works, sends the WETH back to the user.
        ****/ 
        for (uint i=1; i <= 2; i++) {
            uint minOut = ITri(s.tricrypto).get_dy(2, baseTokenOut_, amountIn_ / i);
            uint slippage = ExecutorFacet(s.executor).calculateSlippage(minOut, userDetails_.userSlippage * i);
            
            try ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_ / i, slippage, false) {
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
    }


    function _depositInDeFi(uint fee_, bool isRetry_) private { 
        //Deposit WETH in Curve Tricrypto pool
        (uint tokenAmountIn, uint[3] memory amounts) = _calculateTokenAmountCurve(fee_);
        IWETH(s.WETH).approve(s.tricrypto, tokenAmountIn);

        for (uint i=1; i <= 2; i++) {
            uint minAmount = ExecutorFacet(s.executor).calculateSlippage(tokenAmountIn, s.defaultSlippage * i);

            //Testing variable
            uint testVar = isRetry_ ? minAmount : type(uint).max;

            try ITri(s.tricrypto).add_liquidity(amounts, testVar) { 

                //Deposit crvTricrypto in Yearn
                IERC20(s.crvTricrypto).approve(s.yTriPool, IERC20(s.crvTricrypto).balanceOf(address(this)));
                IYtri(s.yTriPool).deposit(IERC20(s.crvTricrypto).balanceOf(address(this)));

                //Internal fees accounting
                if (s.failedFees > 0) s.failedFees = 0;
                s.feesVault += fee_;

                emit ForTesting(24);
                break;
            } catch {
                if (i == 1) {
                    continue;
                } else {
                    if (!isRetry_) {
                        s.failedFees += fee_;
                        emit ForTesting(23);
                    } 
                }
            }
        }
    }
}


/**
    ExecutorFacet()
 */

contract ExecutorFacetV1 is SecondaryFunctions {
    
    event ForTesting(uint indexed testNum);


    function executeFinalTrade( 
        TradeOps memory swapDetails_, 
        uint userSlippage_,
        address user_,
        uint lockNum_
    ) external payable isAuthorized(lockNum_) noReentrancy(3) {
        address pool = swapDetails_.pool;
        uint inBalance = IERC20(swapDetails_.baseToken).balanceOf(address(this));
        uint minOut;
        uint slippage;

        if (pool != s.renPool) IERC20(s.USDT).approve(pool, inBalance);

        /**** 
            Exchanges the amount between the user's slippage (final swap)
            If it fails, it doubles the slippage, divides the amount between two and tries again.
            If none works, sends the baseToken instead to the user.
        ****/ 
        for (uint i=1; i <= 2; i++) {
            if (pool == s.renPool || pool == s.crv2Pool) {

                minOut = IMulCurv(pool).get_dy(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i
                );
                slippage = calculateSlippage(minOut, userSlippage_ * i);

                try IMulCurv(pool).exchange(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, type(uint).max 
                ) {
                    if (i == 2) {
                        try IMulCurv(pool).exchange(
                            swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, type(uint).max 
                        ) {
                            break;
                        } catch {
                            IERC20(swapDetails_.baseToken).transfer(user_, inBalance / 2); 
                            break; 
                        }
                    }
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        IERC20(swapDetails_.baseToken).transfer(user_, inBalance); 
                        emit ForTesting(23);
                        break;
                    }
                }
            } else {
                //code omitted (out of scope of test)
            }
        }
    }
}



contract ExecutorFacetV2 is SecondaryFunctions {
    
    event ForTesting(uint indexed testNum);


    function executeFinalTrade( 
        TradeOps memory swapDetails_, 
        uint userSlippage_,
        address user_,
        uint lockNum_
    ) external payable isAuthorized(lockNum_) noReentrancy(3) {
        address pool = swapDetails_.pool;
        uint inBalance = IERC20(swapDetails_.baseToken).balanceOf(address(this));
        uint minOut;
        uint slippage;

        IERC20(
            pool != s.renPool ? s.USDT : s.WBTC
        ).approve(pool, inBalance);

        /**** 
            Exchanges the amount between the user's slippage (final swap)
            If it fails, it doubles the slippage, divides the amount between two and tries again.
            If none works, sends the baseToken instead to the user.
        ****/ 
        for (uint i=1; i <= 2; i++) {
            if (pool == s.renPool || pool == s.crv2Pool) {

                minOut = IMulCurv(pool).get_dy(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i
                );
                slippage = calculateSlippage(minOut, userSlippage_ * i);

                //Testing vars
                uint testVar = i == 1 ? type(uint).max : slippage;
                
                try IMulCurv(pool).exchange(swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, testVar) {
                    if (i == 2) {
                        try IMulCurv(pool).exchange(swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, slippage) {
                            emit ForTesting(23);
                            break;
                        } catch {
                            IERC20(swapDetails_.baseToken).transfer(user_, inBalance / 2);
                        }
                    }
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        IERC20(swapDetails_.baseToken).transfer(user_, inBalance); 
                    }
                }
            } else {
                //code omitted (out of scope of test)
            }
        }
    }
}



contract ExecutorFacetV3 is SecondaryFunctions {
    
    event ForTesting(uint indexed testNum);


    function executeFinalTrade( 
        TradeOps memory swapDetails_, 
        uint userSlippage_,
        address user_,
        uint lockNum_
    ) external payable isAuthorized(lockNum_) noReentrancy(3) {
        address pool = swapDetails_.pool;
        uint inBalance = IERC20(swapDetails_.baseToken).balanceOf(address(this));
        uint minOut;
        uint slippage;

        IERC20(
            pool != s.renPool ? s.USDT : s.WBTC
        ).approve(pool, inBalance);

        /**** 
            Exchanges the amount between the user's slippage (final swap)
            If it fails, it doubles the slippage, divides the amount between two and tries again.
            If none works, sends the baseToken instead to the user.
        ****/ 
        for (uint i=1; i <= 2; i++) {
            if (pool == s.renPool || pool == s.crv2Pool) {

                minOut = IMulCurv(pool).get_dy(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i
                );
                slippage = calculateSlippage(minOut, userSlippage_ * i);

                //Testing var
                uint testVar = i == 1 ? type(uint).max : slippage;
                
                try IMulCurv(pool).exchange(swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, testVar) {
                    emit ForTesting(23);
                    if (i == 2) {
                        try IMulCurv(pool).exchange(swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, type(uint).max) {
                            break;
                        } catch {
                            IERC20(swapDetails_.baseToken).transfer(user_, inBalance / 2);
                            emit ForTesting(24);
                        }
                    }
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        IERC20(swapDetails_.baseToken).transfer(user_, inBalance); 
                    }
                }
            } else {
                //code omitted (out of scope of test)
            }
        }
    }
}



contract ExecutorFacetV4 is SecondaryFunctions {

    event ForTesting(uint indexed testNum);


    function executeFinalTrade( 
        TradeOps memory swapDetails_, 
        uint userSlippage_,
        address user_,
        uint lockNum_
    ) external payable isAuthorized(lockNum_) noReentrancy(3) {
        address pool = swapDetails_.pool;
        uint inBalance = IERC20(swapDetails_.baseToken).balanceOf(address(this));
        uint minOut;
        uint slippage;

        IERC20(
            pool != s.renPool ? s.USDT : s.WBTC
        ).approve(pool, inBalance);

        /**** 
            Exchanges the amount between the user's slippage (final swap)
            If it fails, it doubles the slippage, divides the amount between two and tries again.
            If none works, sends the baseToken instead to the user.
        ****/ 
        for (uint i=1; i <= 2; i++) {
            if (pool == s.renPool || pool == s.crv2Pool) {
                //code omitted (out of scope of test)
            } else {
                minOut = IMulCurv(pool).get_dy_underlying(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i
                );
                slippage = calculateSlippage(minOut, userSlippage_ * i);
                
                try IMulCurv(pool).exchange_underlying(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, type(uint).max //slippage
                ) {
                    if (i == 2) {
                        try IMulCurv(pool).exchange_underlying(
                            swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, slippage
                        ) {
                            break;
                        } catch {
                            IERC20(swapDetails_.baseToken).transfer(user_, inBalance / 2);
                        }
                    }
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        IERC20(swapDetails_.baseToken).transfer(user_, inBalance); 
                        emit ForTesting(23);
                    }
                }
            }
        }
    }



}



contract ExecutorFacetV5 is SecondaryFunctions {

    event ForTesting(uint indexed testNum);


    function executeFinalTrade( 
        TradeOps memory swapDetails_, 
        uint userSlippage_,
        address user_,
        uint lockNum_
    ) external payable isAuthorized(lockNum_) noReentrancy(3) {
        address pool = swapDetails_.pool;
        uint inBalance = IERC20(swapDetails_.baseToken).balanceOf(address(this));
        uint minOut;
        uint slippage;

        IERC20(
            pool != s.renPool ? s.USDT : s.WBTC
        ).approve(pool, inBalance);

        /**** 
            Exchanges the amount between the user's slippage (final swap)
            If it fails, it doubles the slippage, divides the amount between two and tries again.
            If none works, sends the baseToken instead to the user.
        ****/ 
        for (uint i=1; i <= 2; i++) {
            if (pool == s.renPool || pool == s.crv2Pool) {
                //code omitted (out of scope of test)
            } else {
                minOut = IMulCurv(pool).get_dy_underlying(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i
                );
                slippage = calculateSlippage(minOut, userSlippage_ * i);

                //Test var
                uint testVar = i == 1 ? type(uint).max : slippage;
                
                try IMulCurv(pool).exchange_underlying(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, testVar 
                ) {
                    if (i == 2) {
                        try IMulCurv(pool).exchange_underlying(
                            swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, slippage
                        ) {
                            emit ForTesting(23);
                            break;
                        } catch {
                            IERC20(swapDetails_.baseToken).transfer(user_, inBalance / 2);
                        }
                    }
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        IERC20(swapDetails_.baseToken).transfer(user_, inBalance); 
                    }
                }
            }
        }
    }
}



contract ExecutorFacetV6 is SecondaryFunctions {

    event ForTesting(uint indexed testNum);


    function executeFinalTrade( 
        TradeOps memory swapDetails_, 
        uint userSlippage_,
        address user_,
        uint lockNum_
    ) external payable isAuthorized(lockNum_) noReentrancy(3) {
        address pool = swapDetails_.pool;
        uint inBalance = IERC20(swapDetails_.baseToken).balanceOf(address(this));
        uint minOut;
        uint slippage;

        IERC20(
            pool != s.renPool ? s.USDT : s.WBTC
        ).approve(pool, inBalance);

        /**** 
            Exchanges the amount between the user's slippage (final swap)
            If it fails, it doubles the slippage, divides the amount between two and tries again.
            If none works, sends the baseToken instead to the user.
        ****/ 
        for (uint i=1; i <= 2; i++) {
            if (pool == s.renPool || pool == s.crv2Pool) {
                //code omitted (out of scope of test)
            } else {
                minOut = IMulCurv(pool).get_dy_underlying(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i
                );
                slippage = calculateSlippage(minOut, userSlippage_ * i);

                //Test var
                uint testVar = i == 1 ? type(uint).max : slippage;
                uint testVar2 = type(uint).max;
                
                try IMulCurv(pool).exchange_underlying(
                    swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, testVar 
                ) {
                    if (i == 2) {
                        try IMulCurv(pool).exchange_underlying(
                            swapDetails_.tokenIn, swapDetails_.tokenOut, inBalance / i, testVar2
                        ) {
                            break;
                        } catch {
                            IERC20(swapDetails_.baseToken).transfer(user_, inBalance / 2);
                            emit ForTesting(23);
                        }
                    }
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        IERC20(swapDetails_.baseToken).transfer(user_, inBalance); 
                    }
                }
            }
        }
    }
}