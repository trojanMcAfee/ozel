// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import { LibDiamond } from "../../libraries/LibDiamond.sol";
import { ITri } from '../../interfaces/ICurve.sol';
import { ModifiersARB } from '../../Modifiers.sol';
import '../../libraries/LibCommon.sol';
import '../../interfaces/IYtri.sol';
import '../../interfaces/IWETH.sol';
import './ExecutorFacet.sol';
import './oz4626Facet.sol';
import '../../Errors.sol';

// import 'hardhat/console.sol';


contract OZLFacet is ModifiersARB { 

    using SafeERC20 for IERC20;
    using Address for address;

    event NewUserToken(address userToken);

    /**
    WBTC: 1 / USDT: 0 / WETH: 2
     */

     /*******
        State changing functions
     ******/   

    function exchangeToUserToken(
        UserConfig calldata userDetails_
    ) external payable noReentrancy(0) filterDetails(userDetails_) { 
        if (msg.value <= 0) revert CantBeZero('msg.value');

        if (s.failedFees > 0) _depositFeesInDeFi(s.failedFees, true); 

        IWETH(s.WETH).deposit{value: msg.value}();
        uint wethIn = IWETH(s.WETH).balanceOf(address(this));
        wethIn = s.failedFees == 0 ? wethIn : wethIn - s.failedFees;

        //Mutex bitmap lock
        _toggleBit(1, 0);

        //Deposits in oz4626Facet
        bytes memory data = abi.encodeWithSignature(
            'deposit(uint256,address,uint256)', 
            wethIn, userDetails_.user, 0
        );

        LibDiamond.callFacet(data);

        (uint netAmountIn, uint fee) = _getFee(wethIn);

        uint baseTokenOut = 
            userDetails_.userToken == s.WBTC || userDetails_.userToken == s.renBTC ? 1 : 0;

        //Swaps WETH to userToken (Base: USDT-WBTC / Route: MIM-USDC-renBTC-WBTC) 
        _swapsForUserToken(
            netAmountIn, baseTokenOut, userDetails_
        );
      
        uint toUser = IERC20(userDetails_.userToken).balanceOf(address(this));
        if (toUser > 0) IERC20(userDetails_.userToken).safeTransfer(userDetails_.user, toUser);

        _depositFeesInDeFi(fee, false);
    }




    function _swapsForUserToken(
        uint amountIn_, 
        uint baseTokenOut_, 
        UserConfig memory userDetails_
    ) private {
        IERC20(s.WETH).approve(s.tricrypto, amountIn_);

        /**** 
            Exchanges the amount between the user's slippage. 
            If it fails, it doubles the slippage, divides the amount between two and tries again.
            If none works, sends WETH back to the user.
        ****/ 
        
        for (uint i=1; i <= 2; i++) {
            uint minOut = ITri(s.tricrypto).get_dy(2, baseTokenOut_, amountIn_ / i);
            uint slippage = ExecutorFacet(s.executor).calculateSlippage(minOut, userDetails_.userSlippage * i);
            
            try ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_ / i, slippage, false) {
                if (i == 2) {
                    try ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_ / i, slippage, false) {
                        break;
                    } catch {
                        IERC20(s.WETH).transfer(userDetails_.user, amountIn_ / 2);
                        break;
                    }
                }
                break;
            } catch {
                if (i == 1) {
                    continue;
                } else {
                    IERC20(s.WETH).transfer(userDetails_.user, amountIn_);
                }
            }
        }
        
        uint baseBalance = IERC20(baseTokenOut_ == 0 ? s.USDT : s.WBTC).balanceOf(address(this));

        if ((userDetails_.userToken != s.USDT && userDetails_.userToken != s.WBTC) && baseBalance > 0) { 
            _tradeWithExecutor(userDetails_); 
        }
        
    }

    

    function withdrawUserShare(
        UserConfig memory userDetails_,
        address receiver_,
        uint shares_
    ) external onlyWhenEnabled filterDetails(userDetails_) { 
        if (receiver_ == address(0)) revert CantBeZero('address');
        if (shares_ <= 0) revert CantBeZero('shares');

        //Queries if there are failed fees. If true, it deposits them
        if (s.failedFees > 0) _depositFeesInDeFi(s.failedFees, true);

        //Mutex bitmap lock
        _toggleBit(1, 3);

        bytes memory data = abi.encodeWithSignature(
            'redeem(uint256,address,address,uint256)', 
            shares_, receiver_, userDetails_.user, 3
        );

        data = LibDiamond.callFacet(data);

        uint assets = abi.decode(data, (uint));
        IYtri(s.yTriPool).withdraw(assets);

        //tricrypto= USDT: 0 / crv2- USDT: 1 , USDC: 0 / mim- MIM: 0 , CRV2lp: 1
        uint tokenAmountIn = ITri(s.tricrypto).calc_withdraw_one_coin(assets, 0); 
        
        uint minOut = ExecutorFacet(s.executor).calculateSlippage(
            tokenAmountIn, userDetails_.userSlippage
        ); 

        ITri(s.tricrypto).remove_liquidity_one_coin(assets, 0, minOut);

        _tradeWithExecutor(userDetails_); 

        uint userTokens = IERC20(userDetails_.userToken).balanceOf(address(this));
        IERC20(userDetails_.userToken).safeTransfer(receiver_, userTokens); 
    } 
    

    function _depositFeesInDeFi(uint fee_, bool isRetry_) private { 
        //Deposit WETH in Curve Tricrypto pool
        (uint tokenAmountIn, uint[3] memory amounts) = _calculateTokenAmountCurve(fee_);

        IERC20(s.WETH).approve(s.tricrypto, tokenAmountIn);

        for (uint i=1; i <= 2; i++) {
            uint minAmount = ExecutorFacet(s.executor).calculateSlippage(tokenAmountIn, s.defaultSlippage * i);

            try ITri(s.tricrypto).add_liquidity(amounts, minAmount) {
                //Deposit crvTricrypto in Yearn
                IERC20(s.crvTricrypto).approve(
                    s.yTriPool, IERC20(s.crvTricrypto).balanceOf(address(this))
                );

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


    function addTokenToDatabase(TradeOps memory newSwap_) external { 
        LibDiamond.enforceIsContractOwner();
        if (s.tokenDatabase[newSwap_.userToken]) revert TokenAlreadyInDatabase(newSwap_.userToken);
        
        s.tokenDatabase[newSwap_.userToken] = true;
        s.swaps.push(newSwap_);
        emit NewUserToken(newSwap_.userToken);
    }

    function removeTokenFromDatabase(TradeOps memory swapToRemove_) external {
        LibDiamond.enforceIsContractOwner();
        if(!s.tokenDatabase[swapToRemove_.userToken]) revert TokenNotInDatabase(swapToRemove_.userToken);

        s.tokenDatabase[swapToRemove_.userToken] = false;
        LibCommon.remove(s.swaps, swapToRemove_);
    }


    /*******
        Helper functions
     ******/

    function _getFee(uint amount_) private view returns(uint, uint) {
        uint fee = amount_ - ExecutorFacet(s.executor).calculateSlippage(amount_, s.dappFee);
        uint netAmount = amount_ - fee;
        return (netAmount, fee);
    }

    function _tradeWithExecutor(UserConfig memory userDetails_) private { 
        _toggleBit(1, 2);
        uint length = s.swaps.length;

        for (uint i=0; i < length;) {
            if (s.swaps[i].userToken == userDetails_.userToken) {
                bytes memory data = abi.encodeWithSignature(
                    'executeFinalTrade((int128,int128,address,address,address),uint256,address,uint256)', 
                    s.swaps[i], userDetails_.userSlippage, userDetails_.user, 2
                );

                LibDiamond.callFacet(data);
                break;
            }
            unchecked { ++i; }
        }
    }

    function _calculateTokenAmountCurve(uint wethAmountIn_) private view returns(uint, uint[3] memory) {
        uint[3] memory amounts;
        amounts[0] = 0;
        amounts[1] = 0;
        amounts[2] = wethAmountIn_;
        uint tokenAmount = ITri(s.tricrypto).calc_token_amount(amounts, true);
        return (tokenAmount, amounts);
    }
}





