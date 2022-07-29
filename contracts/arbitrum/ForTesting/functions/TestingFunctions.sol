// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;


// import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
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

    //----------------


    function _swapWETHforRevenue(address owner_, uint balanceWETH_, uint price_) internal {        
        IERC20(s.WETH).approve(address(s.swapRouter), balanceWETH_);

        for (uint i=1; i <= 2; i++) {
            ISwapRouter.ExactInputSingleParams memory params =
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: s.WETH,
                    tokenOut: s.revenueToken, 
                    fee: s.poolFee, 
                    recipient: owner_,
                    deadline: block.timestamp,
                    amountIn: balanceWETH_ / i,
                    amountOutMinimum: _calculateMinOut(balanceWETH_, i, price_), 
                    sqrtPriceLimitX96: 0
                });

            try s.swapRouter.exactInputSingle(params) {
                if (i == 2) {
                    try s.swapRouter.exactInputSingle(params) {
                        break;
                    } catch {
                        IERC20(s.WETH).transfer(owner_, balanceWETH_ / i);
                    }
                }
                break;
            } catch {
                if (i == 1) {
                    continue; 
                } else {
                    IERC20(s.WETH).transfer(owner_, balanceWETH_);
                }
            }
        }
    }


    function _meh_sendMeTri(address owner_) internal {
        uint balanceTri = IERC20(s.crvTricrypto).balanceOf(address(this));
        IERC20(s.crvTricrypto).transfer(owner_, balanceTri);

        // balanceTri = IERC20(s.crvTricrypto).balanceOf(owner_);
        // console.log('bal tri owner: ', balanceTri);
        // console.log(9);
    }


    function _calculateMinOut(uint balanceWETH_, uint i_, uint price_) internal view returns(uint minOut) {
        uint expectedOut = balanceWETH_.mulDivDown(price_ * 10 ** 10, 1 ether);
        uint minOutUnprocessed = 
            expectedOut - expectedOut.mulDivDown(s.defaultSlippage * i_ * 100, 1000000); 
        minOut = minOutUnprocessed.mulWadDown(10 ** 6);
    }


    function _shift(uint i_) internal returns(uint) {
        uint element = s.revenueAmounts[i_];
        s.revenueAmounts[i_] = s.revenueAmounts[s.revenueAmounts.length - 1];
        delete s.revenueAmounts[s.revenueAmounts.length - 1];
        s.revenueAmounts.pop();
        return element;
    }

    function setTESTVAR2(uint num_, bytes32 position_) public {
        assembly {
            sstore(position_, num_)
        }
    }

    function _getTESTVAR2(bytes32 position_) internal view returns(uint testVar2) {
        assembly {
            testVar2 := sload(position_)
        }
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
        UserConfig memory userDetails_
    ) external payable noReentrancy(0) filterDetails(userDetails_) { 
        if (msg.value <= 0) revert CantBeZero('msg.value');

        IWETH(s.WETH).deposit{value: msg.value}();
        uint wethIn = IWETH(s.WETH).balanceOf(address(this));
        wethIn = s.failedFees == 0 ? wethIn : wethIn - s.failedFees;

        //Deposits in oz4626Facet
        _toggleBit(1, 0);
        
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
        UserConfig memory userDetails_,
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
        UserConfig memory userDetails_
    ) external payable noReentrancy(0) filterDetails(userDetails_) { 
        if (msg.value <= 0) revert CantBeZero('msg.value');

        IWETH(s.WETH).deposit{value: msg.value}();
        uint wethIn = IWETH(s.WETH).balanceOf(address(this));
        wethIn = s.failedFees == 0 ? wethIn : wethIn - s.failedFees;

        //Deposits in oz4626Facet
        _toggleBit(1, 0);
        
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
        UserConfig memory userDetails_,
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
        UserConfig memory userDetails_
    ) external payable noReentrancy(0) filterDetails(userDetails_) { 
        if (msg.value <= 0) revert CantBeZero('msg.value');

        IWETH(s.WETH).deposit{value: msg.value}();
        uint wethIn = IWETH(s.WETH).balanceOf(address(this));
        wethIn = s.failedFees == 0 ? wethIn : wethIn - s.failedFees;

        //Deposits in oz4626Facet
        _toggleBit(1, 0);
        
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
        UserConfig memory userDetails_,
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
    DepositFeesInDeFi()
 */

contract DepositFeesInDeFiV1 is SecondaryFunctions {
    using SafeTransferLib for IERC20;

    event ForTesting(uint indexed testNum);
    event DeadVariables(address variable, bytes4 variable2);

    function exchangeToUserToken(
        UserConfig memory userDetails_
    ) external payable noReentrancy(0) filterDetails(userDetails_) { 
        if (msg.value <= 0) revert CantBeZero('msg.value');

        if (s.failedFees > 0) _depositFeesInDeFi(s.failedFees, true);

        IWETH(s.WETH).deposit{value: msg.value}();
        uint wethIn = IWETH(s.WETH).balanceOf(address(this));
        wethIn = s.failedFees == 0 ? wethIn : wethIn - s.failedFees;

        //Deposits in oz4626Facet
        _toggleBit(1, 0);
        
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

        _depositFeesInDeFi(fee, false);
    }


    function _swapsForUserToken(
        uint amountIn_, 
        uint baseTokenOut_, 
        UserConfig memory userDetails_,
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


    function _depositFeesInDeFi(uint fee_, bool isRetry_) private { 
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

/**
    _computeRevenue()
 */

contract ComputeRevenueV1 is SecondaryFunctions {

    using FixedPointMathLib for uint;

    event RevenueEarned(uint indexed amount);
    event ForTesting(uint indexed testNum);

    bytes32 constant TESTVAR2_POSITION = keccak256('testvar2.position');

    //WETH: 2, USDT: 0
    function checkForRevenue() external payable {
        (,int price,,,) = s.priceFeed.latestRoundData();          
        uint TESTVAR = 250;

        for (uint j=0; j < s.revenueAmounts.length; j++) {

            if ((s.feesVault * 2) * uint(price) >= s.revenueAmounts[j] * 1 ether) {
                uint yBalance = IYtri(s.yTriPool).balanceOf(address(this));
                uint priceShare = IYtri(s.yTriPool).pricePerShare();

                uint balanceCrv3 = (yBalance * priceShare) / 1 ether;
                uint triBalance = ITri(s.tricrypto).calc_withdraw_one_coin(balanceCrv3, 2);
                uint valueUM = triBalance * (uint(price) / 10 ** 8);

                for (uint i=0; i < s.revenueAmounts.length; i++) {
                    if (valueUM >= s.revenueAmounts[i] * 1 ether) {
                        uint denominator = s.revenueAmounts[i] == TESTVAR ? 5 : 10;
                        uint TESTVAR2 = _getTESTVAR2(TESTVAR2_POSITION);

                        if (TESTVAR2 == 1) {
                            _computeRevenue(denominator, yBalance, uint(price));
                            setTESTVAR2(2, TESTVAR2_POSITION);
                        }

                        // uint deletedEl = _shift(i); //<--- so the other tests can used s.revenueAmounts fully
                        // emit RevenueEarned(deletedEl);
                    }
                }
                break;
            }
        }
    }


    function _computeRevenue(uint denominator_, uint balance_, uint price_) internal {        
        address owner;
        uint assetsToWithdraw = balance_ / denominator_;
        IYtri(s.yTriPool).withdraw(assetsToWithdraw);

        for (uint i=1; i <= 2; i++) {
            uint triAmountWithdraw = ITri(s.tricrypto).calc_withdraw_one_coin(assetsToWithdraw / i, 2); 
            uint minOut = ExecutorFacet(s.executor).calculateSlippage(
                triAmountWithdraw, s.defaultSlippage
            ); 

            try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                uint balanceWETH = IERC20(s.WETH).balanceOf(address(this));
                owner = LibDiamond.contractOwner();

                    if (i == 2) {
                        try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                            balanceWETH = IERC20(s.WETH).balanceOf(address(this));
                            _swapWETHforRevenue(owner, balanceWETH, price_);
                            break;
                        } catch {
                            _meh_sendMeTri(owner); 
                            break;
                        }
                    }
                    _swapWETHforRevenue(owner, balanceWETH, price_);
                    emit ForTesting(23);
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        _meh_sendMeTri(owner); 
                    }
                }
        }
    }


}



contract ComputeRevenueV2 is SecondaryFunctions {

    using FixedPointMathLib for uint;

    event RevenueEarned(uint indexed amount);
    event ForTesting(uint indexed testNum);

    bytes32 constant TESTVAR2_SECOND_POSITION = keccak256('testvar2.second.position');

    //WETH: 2, USDT: 0
    function checkForRevenue() external payable {
        (,int price,,,) = s.priceFeed.latestRoundData(); 
             
        uint TESTVAR = 250;

        for (uint j=0; j < s.revenueAmounts.length; j++) {

            if ((s.feesVault * 2) * uint(price) >= s.revenueAmounts[j] * 1 ether) {
                uint yBalance = IYtri(s.yTriPool).balanceOf(address(this));
                uint priceShare = IYtri(s.yTriPool).pricePerShare();

                uint balanceCrv3 = (yBalance * priceShare) / 1 ether;
                uint triBalance = ITri(s.tricrypto).calc_withdraw_one_coin(balanceCrv3, 2);
                uint valueUM = triBalance * (uint(price) / 10 ** 8);

                for (uint i=0; i < s.revenueAmounts.length; i++) {
                    if (valueUM >= s.revenueAmounts[i] * 1 ether) {
                        uint denominator = s.revenueAmounts[i] == TESTVAR ? 5 : 10;
                        uint TESTVAR2 = _getTESTVAR2(TESTVAR2_SECOND_POSITION);

                        if (TESTVAR2 == 1) {
                            _computeRevenue(denominator, yBalance, uint(price));
                            setTESTVAR2(2, TESTVAR2_SECOND_POSITION);
                        }

                        // uint deletedEl = _shift(i); //<--- so the other tests can used s.revenueAmounts fully
                        // emit RevenueEarned(deletedEl);
                    }
                }
                break;
            }
        }
    }


    function _computeRevenue(uint denominator_, uint balance_, uint price_) internal {      
        address owner = LibDiamond.contractOwner(); 
        uint assetsToWithdraw = balance_ / denominator_;
        IYtri(s.yTriPool).withdraw(assetsToWithdraw);

        for (uint i=1; i <= 2; i++) {
            uint triAmountWithdraw = ITri(s.tricrypto).calc_withdraw_one_coin(assetsToWithdraw / i, 2); 
            uint minOut = ExecutorFacet(s.executor).calculateSlippage(
                triAmountWithdraw, s.defaultSlippage
            ); 

            uint TESTVAR = type(uint).max;
            
            try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, TESTVAR) {
                uint balanceWETH = IERC20(s.WETH).balanceOf(address(this));

                    if (i == 2) {
                        try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                            balanceWETH = IERC20(s.WETH).balanceOf(address(this));
                            _swapWETHforRevenue(owner, balanceWETH, price_);
                            break;
                        } catch {
                            _meh_sendMeTri(owner); 
                            break;
                        }
                    }
                    _swapWETHforRevenue(owner, balanceWETH, price_);
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        _meh_sendMeTri(owner); 
                        emit ForTesting(23);
                    }
                }
        }
    }


}



contract ComputeRevenueV3 is SecondaryFunctions {

    using FixedPointMathLib for uint;

    event RevenueEarned(uint indexed amount);
    event ForTesting(uint indexed testNum);

    bytes32 constant TESTVAR2_THIRD_POSITION = keccak256('testvar2.third.position');


    //WETH: 2, USDT: 0
    function checkForRevenue() external payable {
        (,int price,,,) = s.priceFeed.latestRoundData(); 
             
        uint TESTVAR = 250;

        for (uint j=0; j < s.revenueAmounts.length; j++) {

            if ((s.feesVault * 2) * uint(price) >= s.revenueAmounts[j] * 1 ether) {
                uint yBalance = IYtri(s.yTriPool).balanceOf(address(this));
                uint priceShare = IYtri(s.yTriPool).pricePerShare();

                uint balanceCrv3 = (yBalance * priceShare) / 1 ether;
                uint triBalance = ITri(s.tricrypto).calc_withdraw_one_coin(balanceCrv3, 2);
                uint valueUM = triBalance * (uint(price) / 10 ** 8);

                for (uint i=0; i < s.revenueAmounts.length; i++) {
                    if (valueUM >= s.revenueAmounts[i] * 1 ether) {
                        uint denominator = s.revenueAmounts[i] == TESTVAR ? 5 : 10;
                        uint TESTVAR2 = _getTESTVAR2(TESTVAR2_THIRD_POSITION);

                        if (TESTVAR2 == 1) {
                            _computeRevenue(denominator, yBalance, uint(price));
                            setTESTVAR2(2, TESTVAR2_THIRD_POSITION);
                        }

                        // uint deletedEl = _shift(i); //<--- so the other tests can used s.revenueAmounts fully
                        // emit RevenueEarned(deletedEl);
                    }
                }
                break;
            }
        }
    }


    function _computeRevenue(uint denominator_, uint balance_, uint price_) internal {        
        address owner = LibDiamond.contractOwner(); 
        uint assetsToWithdraw = balance_ / denominator_;
        IYtri(s.yTriPool).withdraw(assetsToWithdraw);

        for (uint i=1; i <= 2; i++) {
            uint triAmountWithdraw = ITri(s.tricrypto).calc_withdraw_one_coin(assetsToWithdraw / i, 2); 
            uint minOut = ExecutorFacet(s.executor).calculateSlippage(
                triAmountWithdraw, s.defaultSlippage
            ); 

            uint TESTVAR = i == 1 ? type(uint).max : minOut;
            
            try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, TESTVAR) {
                uint balanceWETH = IERC20(s.WETH).balanceOf(address(this));

                    if (i == 2) {
                        try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                            balanceWETH = IERC20(s.WETH).balanceOf(address(this));
                            _swapWETHforRevenue(owner, balanceWETH, price_);
                            emit ForTesting(23);
                            break;
                        } catch {
                            _meh_sendMeTri(owner); 
                            break;
                        }
                    }
                    _swapWETHforRevenue(owner, balanceWETH, price_);
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        _meh_sendMeTri(owner); 
                    }
                }
        }
    }


}



contract ComputeRevenueV4 is SecondaryFunctions {

    using FixedPointMathLib for uint;

    event RevenueEarned(uint indexed amount);
    event ForTesting(uint indexed testNum);


    //WETH: 2, USDT: 0
    function checkForRevenue() external payable {
        (,int price,,,) = s.priceFeed.latestRoundData(); 
             
        uint TESTVAR = 250;

        for (uint j=0; j < s.revenueAmounts.length; j++) {

            if ((s.feesVault * 2) * uint(price) >= s.revenueAmounts[j] * 1 ether) {
                uint yBalance = IYtri(s.yTriPool).balanceOf(address(this));
                uint priceShare = IYtri(s.yTriPool).pricePerShare();

                uint balanceCrv3 = (yBalance * priceShare) / 1 ether;
                uint triBalance = ITri(s.tricrypto).calc_withdraw_one_coin(balanceCrv3, 2);
                uint valueUM = triBalance * (uint(price) / 10 ** 8);

                for (uint i=0; i < s.revenueAmounts.length; i++) {
                    if (valueUM >= s.revenueAmounts[i] * 1 ether) {
                        uint denominator = s.revenueAmounts[i] == TESTVAR ? 5 : 10;
                        _computeRevenue(denominator, yBalance, uint(price));
                        // uint deletedEl = _shift(i); //<--- so the other tests can used s.revenueAmounts fully
                        // emit RevenueEarned(deletedEl);
                    }
                }
                break;
            }
        }
    }


    function _computeRevenue(uint denominator_, uint balance_, uint price_) internal {        
        address owner = LibDiamond.contractOwner(); 
        uint assetsToWithdraw = balance_ / denominator_;
        IYtri(s.yTriPool).withdraw(assetsToWithdraw);

        for (uint i=1; i <= 2; i++) {
            uint triAmountWithdraw = ITri(s.tricrypto).calc_withdraw_one_coin(assetsToWithdraw / i, 2); 
            uint minOut = ExecutorFacet(s.executor).calculateSlippage(
                triAmountWithdraw, s.defaultSlippage
            ); 

            //Testing vars
            uint TESTVAR = i == 1 ? type(uint).max : minOut;
            uint TESTVAR2 = type(uint).max;
            
            try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, TESTVAR) {
                uint balanceWETH = IERC20(s.WETH).balanceOf(address(this));

                    if (i == 2) {
                        try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, TESTVAR2) {
                            balanceWETH = IERC20(s.WETH).balanceOf(address(this));
                            _swapWETHforRevenue(owner, balanceWETH, price_);
                            break;
                        } catch {
                            _meh_sendMeTri(owner); 
                            IERC20(s.WETH).transfer(owner, balanceWETH);
                            emit ForTesting(23);
                            break;
                        }
                    }
                    _swapWETHforRevenue(owner, balanceWETH, price_);
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        _meh_sendMeTri(owner); 
                    }
                }
        }
    }


}


/**
    _swapWETHforRevenue()
 */


contract SwapWETHforRevenueV1 {

    AppStorage s;

    using FixedPointMathLib for uint;

    event ForTesting(uint indexed testNum);
    event DeadVariables(uint variable);


    function checkForRevenue() external payable {
        (,int price,,,) = s.priceFeed.latestRoundData();

        for (uint j=0; j < s.revenueAmounts.length; j++) {

            if ((s.feesVault * 2) * uint(price) >= s.revenueAmounts[j] * 1 ether) {
                uint yBalance = IYtri(s.yTriPool).balanceOf(address(this));
                uint priceShare = IYtri(s.yTriPool).pricePerShare();

                uint balanceCrv3 = (yBalance * priceShare) / 1 ether;
                uint triBalance = ITri(s.tricrypto).calc_withdraw_one_coin(balanceCrv3, 2);
                uint valueUM = triBalance * (uint(price) / 10 ** 8);

                for (uint i=0; i < s.revenueAmounts.length; i++) {
                    if (valueUM >= s.revenueAmounts[i] * 1 ether) {
                        uint denominator = s.revenueAmounts[i] == 10000000 ? 5 : 10;
                        _computeRevenue(denominator, yBalance, uint(price));
                        // uint deletedEl = _shift(i); //<--- so the other tests can used s.revenueAmounts fully
                        // emit RevenueEarned(deletedEl);
                    }
                }
                break;
            }
        }
    }


    function _computeRevenue(uint denominator_, uint balance_, uint price_) private {        
        address owner = LibDiamond.contractOwner(); 
        uint assetsToWithdraw = balance_ / denominator_;
        IYtri(s.yTriPool).withdraw(assetsToWithdraw);

        for (uint i=1; i <= 2; i++) {
            uint triAmountWithdraw = ITri(s.tricrypto).calc_withdraw_one_coin(assetsToWithdraw / i, 2); 
            uint minOut = ExecutorFacet(s.executor).calculateSlippage(
                triAmountWithdraw, s.defaultSlippage
            ); 

            try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                uint balanceWETH = IERC20(s.WETH).balanceOf(address(this));

                    if (i == 2) {
                        try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                            balanceWETH = IERC20(s.WETH).balanceOf(address(this));
                            _swapWETHforRevenue(owner, balanceWETH, price_);
                            break;
                        } catch {
                            _meh_sendMeTri(owner); 
                            break;
                        }
                    }
                    _swapWETHforRevenue(owner, balanceWETH, price_);
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        _meh_sendMeTri(owner); 
                    }
                }
        }
    }


    function _swapWETHforRevenue(address owner_, uint balanceWETH_, uint price_) private {
        IERC20(s.WETH).approve(address(s.swapRouter), balanceWETH_);
        emit DeadVariables(price_);

        uint TESTVAR = type(uint).max;

        for (uint i=1; i <= 2; i++) {
            ISwapRouter.ExactInputSingleParams memory params =
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: s.WETH,
                    tokenOut: s.revenueToken,
                    fee: s.poolFee, 
                    recipient: owner_,
                    deadline: block.timestamp,
                    amountIn: balanceWETH_ / i,
                    amountOutMinimum: TESTVAR, 
                    sqrtPriceLimitX96: 0
                });

            try s.swapRouter.exactInputSingle(params) {
                if (i == 2) {
                    try s.swapRouter.exactInputSingle(params) {
                        break;
                    } catch {
                        IERC20(s.WETH).transfer(owner_, balanceWETH_ / i);
                    }
                }
                break;
            } catch {
                if (i == 1) {
                    continue; 
                } else {
                    IERC20(s.WETH).transfer(owner_, balanceWETH_);
                    emit ForTesting(23);
                }
            }
        }
    }


    function _meh_sendMeTri(address owner_) private {
        uint balanceTri = IERC20(s.crvTricrypto).balanceOf(address(this));
        IERC20(s.crvTricrypto).transfer(owner_, balanceTri);
    }

    function _shift(uint i_) private returns(uint) {
        uint element = s.revenueAmounts[i_];
        s.revenueAmounts[i_] = s.revenueAmounts[s.revenueAmounts.length - 1];
        delete s.revenueAmounts[s.revenueAmounts.length - 1];
        s.revenueAmounts.pop();
        return element;
    }
}



contract SwapWETHforRevenueV2 {

    AppStorage s;

    using FixedPointMathLib for uint;

    event ForTesting(uint indexed testNum);


    function checkForRevenue() external payable {
        (,int price,,,) = s.priceFeed.latestRoundData();

        for (uint j=0; j < s.revenueAmounts.length; j++) {

            if ((s.feesVault * 2) * uint(price) >= s.revenueAmounts[j] * 1 ether) {                
                uint yBalance = IYtri(s.yTriPool).balanceOf(address(this));
                uint priceShare = IYtri(s.yTriPool).pricePerShare();

                uint balanceCrv3 = (yBalance * priceShare) / 1 ether;
                uint triBalance = ITri(s.tricrypto).calc_withdraw_one_coin(balanceCrv3, 2);
                uint valueUM = triBalance * (uint(price) / 10 ** 8);

                for (uint i=0; i < s.revenueAmounts.length; i++) {
                    if (valueUM >= s.revenueAmounts[i] * 1 ether) {
                        uint denominator = s.revenueAmounts[i] == 10000000 ? 5 : 10;
                        _computeRevenue(denominator, yBalance, uint(price));
                        // uint deletedEl = _shift(i); //<--- so the other tests can used s.revenueAmounts fully
                        // emit RevenueEarned(deletedEl);
                    }
                }
                break;
            }
        }
    }


    function _computeRevenue(uint denominator_, uint balance_, uint price_) private {                
        address owner = LibDiamond.contractOwner(); 
        uint assetsToWithdraw = balance_ / denominator_;
        IYtri(s.yTriPool).withdraw(assetsToWithdraw);

        for (uint i=1; i <= 2; i++) {
            uint triAmountWithdraw = ITri(s.tricrypto).calc_withdraw_one_coin(assetsToWithdraw / i, 2); 
            uint minOut = ExecutorFacet(s.executor).calculateSlippage(
                triAmountWithdraw, s.defaultSlippage
            ); 

            try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                uint balanceWETH = IERC20(s.WETH).balanceOf(address(this));

                    if (i == 2) {
                        try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                            balanceWETH = IERC20(s.WETH).balanceOf(address(this));
                            _swapWETHforRevenue(owner, balanceWETH, price_);
                            break;
                        } catch {
                            _meh_sendMeTri(owner); 
                            break;
                        }
                    }
                    _swapWETHforRevenue(owner, balanceWETH, price_);
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        _meh_sendMeTri(owner); 
                    }
                }
        }
    }


    function _swapWETHforRevenue(address owner_, uint balanceWETH_, uint price_) private {        
        IERC20(s.WETH).approve(address(s.swapRouter), balanceWETH_);

        for (uint i=1; i <= 2; i++) {
            uint TESTVAR = i == 1 ? type(uint).max : (_calculateMinOut(balanceWETH_, i, price_) / i);

            ISwapRouter.ExactInputSingleParams memory params =
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: s.WETH,
                    tokenOut: s.revenueToken,
                    fee: s.poolFee, 
                    recipient: owner_,
                    deadline: block.timestamp,
                    amountIn: balanceWETH_ / i,
                    amountOutMinimum: TESTVAR, 
                    sqrtPriceLimitX96: 0
                });

            try s.swapRouter.exactInputSingle(params) {
                if (i == 2) {
                    try s.swapRouter.exactInputSingle(params) {
                        emit ForTesting(23);
                        break;
                    } catch {
                        IERC20(s.WETH).transfer(owner_, balanceWETH_ / i);
                    }
                }
                break;
            } catch {
                if (i == 1) {
                    continue; 
                } else {
                    IERC20(s.WETH).transfer(owner_, balanceWETH_);
                }
            }
        }
    }

    function _meh_sendMeTri(address owner_) private {
        uint balanceTri = IERC20(s.crvTricrypto).balanceOf(address(this));
        IERC20(s.crvTricrypto).transfer(owner_, balanceTri);
    }


    function _calculateMinOut(uint balanceWETH_, uint i_, uint price_) private view returns(uint minOut) {
        uint expectedOut = balanceWETH_.mulDivDown(price_ * 10 ** 10, 1 ether);
        uint minOutUnprocessed = 
            expectedOut - expectedOut.mulDivDown(s.defaultSlippage * i_ * 100, 1000000); 
        minOut = minOutUnprocessed.mulWadDown(10 ** 6);
    }


    function _shift(uint i_) private returns(uint) {
        uint element = s.revenueAmounts[i_];
        s.revenueAmounts[i_] = s.revenueAmounts[s.revenueAmounts.length - 1];
        delete s.revenueAmounts[s.revenueAmounts.length - 1];
        s.revenueAmounts.pop();
        return element;
    }
}



contract SwapWETHforRevenueV3 {

    AppStorage s;

    using FixedPointMathLib for uint;

    event RevenueEarned(uint indexed amount);
    event ForTesting(uint indexed testNum);


    function checkForRevenue() external payable {
        (,int price,,,) = s.priceFeed.latestRoundData();

        for (uint j=0; j < s.revenueAmounts.length; j++) {

            if ((s.feesVault * 2) * uint(price) >= s.revenueAmounts[j] * 1 ether) {
                uint yBalance = IYtri(s.yTriPool).balanceOf(address(this));
                uint priceShare = IYtri(s.yTriPool).pricePerShare();

                uint balanceCrv3 = (yBalance * priceShare) / 1 ether;
                uint triBalance = ITri(s.tricrypto).calc_withdraw_one_coin(balanceCrv3, 2);
                uint valueUM = triBalance * (uint(price) / 10 ** 8);

                for (uint i=0; i < s.revenueAmounts.length; i++) {
                    if (valueUM >= s.revenueAmounts[i] * 1 ether) {
                        uint denominator = s.revenueAmounts[i] == 10000000 ? 5 : 10;
                        _computeRevenue(denominator, yBalance, uint(price));
                        uint deletedEl = _shift(i);
                        emit RevenueEarned(deletedEl);
                    }
                }
                break;
            }
        }
    }


    function _computeRevenue(uint denominator_, uint balance_, uint price_) private {        
        address owner = LibDiamond.contractOwner(); 
        uint assetsToWithdraw = balance_ / denominator_;
        IYtri(s.yTriPool).withdraw(assetsToWithdraw);

        for (uint i=1; i <= 2; i++) {
            uint triAmountWithdraw = ITri(s.tricrypto).calc_withdraw_one_coin(assetsToWithdraw / i, 2); 
            uint minOut = ExecutorFacet(s.executor).calculateSlippage(
                triAmountWithdraw, s.defaultSlippage
            ); 

            try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                uint balanceWETH = IERC20(s.WETH).balanceOf(address(this));

                    if (i == 2) {
                        try ITri(s.tricrypto).remove_liquidity_one_coin(assetsToWithdraw / i, 2, minOut) {
                            balanceWETH = IERC20(s.WETH).balanceOf(address(this));
                            _swapWETHforRevenue(owner, balanceWETH, price_);
                            break;
                        } catch {
                            _meh_sendMeTri(owner); 
                            break;
                        }
                    }
                    _swapWETHforRevenue(owner, balanceWETH, price_);
                    break;
                } catch {
                    if (i == 1) {
                        continue;
                    } else {
                        _meh_sendMeTri(owner); 
                    }
                }
        }
    }


    function _swapWETHforRevenue(address owner_, uint balanceWETH_, uint price_) private {        
        IERC20(s.WETH).approve(address(s.swapRouter), balanceWETH_);

        for (uint i=1; i <= 2; i++) {
            uint TESTVAR = i == 1 ? type(uint).max : (_calculateMinOut(balanceWETH_, i, price_) / i);
            uint TESTVAR2 = type(uint).max;

            ISwapRouter.ExactInputSingleParams memory params =
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: s.WETH,
                    tokenOut: s.revenueToken,
                    fee: s.poolFee, 
                    recipient: owner_,
                    deadline: block.timestamp,
                    amountIn: balanceWETH_ / i,
                    amountOutMinimum: TESTVAR, 
                    sqrtPriceLimitX96: 0
                });

            try s.swapRouter.exactInputSingle(params) {
                if (i == 2) {
                    params.amountOutMinimum = TESTVAR2;
                    try s.swapRouter.exactInputSingle(params) {
                        break;
                    } catch {
                        IERC20(s.WETH).transfer(owner_, balanceWETH_ / i);
                        emit ForTesting(23);
                    }
                }
                break;
            } catch {
                if (i == 1) {
                    continue; 
                } else {
                    IERC20(s.WETH).transfer(owner_, balanceWETH_);
                }
            }
        }
    }

    function _meh_sendMeTri(address owner_) private {
        uint balanceTri = IERC20(s.crvTricrypto).balanceOf(address(this));
        IERC20(s.crvTricrypto).transfer(owner_, balanceTri);
    }


    function _calculateMinOut(uint balanceWETH_, uint i_, uint price_) private view returns(uint minOut) {
        uint expectedOut = balanceWETH_.mulDivDown(price_ * 10 ** 10, 1 ether);
        uint minOutUnprocessed = 
            expectedOut - expectedOut.mulDivDown(s.defaultSlippage * i_ * 100, 1000000); 
        minOut = minOutUnprocessed.mulWadDown(10 ** 6);
    }


    function _shift(uint i_) private returns(uint) {
        uint element = s.revenueAmounts[i_];
        s.revenueAmounts[i_] = s.revenueAmounts[s.revenueAmounts.length - 1];
        delete s.revenueAmounts[s.revenueAmounts.length - 1];
        s.revenueAmounts.pop();
        return element;
    }
}



/**
    _filterRevenueCheck()
 */

contract FilterRevenueCheckV1 {
    using FixedPointMathLib for uint;

    event ForTesting(uint indexed testNum);

    function checkForRevenue() external payable {
        emit ForTesting(23);
    }
}



