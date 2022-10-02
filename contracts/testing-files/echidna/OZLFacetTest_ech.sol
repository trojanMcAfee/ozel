// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


// import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../../interfaces/ICrvLpToken.sol';
import '../../interfaces/IWETH.sol';
import '../arbitrum/ExecutorFacetTest.sol';
import '../../arbitrum/facets/oz4626Facet.sol';
import '../../interfaces/IYtri.sol';
import {ITri} from '../../interfaces/ICurve.sol';
import { LibDiamond } from "../../libraries/LibDiamond.sol";
import '@openzeppelin/contracts/utils/Address.sol';

import '../../arbitrum/AppStorage.sol';
import '../../libraries/SafeTransferLib.sol'; //use the @ from solmate
// import '@rari-capital/solmate/src/utils/SafeTransferLib.sol';
import '../../Errors.sol';
import { ModifiersARB } from '../../Modifiers.sol';
import '../arbitrum/RevenueFacetTest.sol';

import './DiamondTest.sol';




contract OZLFacetTest_ech is ModifiersARB { 

    using SafeTransferLib for IERC20;
    using Address for address;

    event NewUserToken(address userToken); 
    event DeadVariables(bool isRetry);

    //** Only function called by Echidna */

    function exchangeToUserToken(
        UserConfig calldata userDetails_
    ) external payable { 
        if (msg.value > 0) {
            assert(false);
        } else {
            assert(true);
        }
    }
    
    //*************/


    function _swapsForUserToken(
        uint amountIn_, 
        uint baseTokenOut_, 
        UserConfig memory userDetails_
    ) private { 
        bool success = IERC20(s.WETH).approve(s.tricrypto, amountIn_);
        assert(success);

        uint minOut = ITri(s.tricrypto).get_dy(2, baseTokenOut_, amountIn_);
        assert(minOut > 0);
        uint slippage = ExecutorFacetTest(s.executor).calculateSlippage(minOut, userDetails_.userSlippage);
        
        ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_, slippage, false);  
        uint baseBalance = IERC20(baseTokenOut_ == 0 ? s.USDT : s.WBTC).balanceOf(address(this));

        if ((userDetails_.userToken != s.USDT && userDetails_.userToken != s.WBTC) && baseBalance > 0) { 
            _tradeWithExecutor(userDetails_); 
        }
    }

    

    function withdrawUserShare(
        UserConfig memory userDetails_,
        address receiver_,
        uint shares_
    ) external { //onlyWhenEnabled 
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
        
        uint minOut = ExecutorFacetTest(s.executor).calculateSlippage(
            tokenAmountIn, userDetails_.userSlippage
        ); 

        ITri(s.tricrypto).remove_liquidity_one_coin(assets, 0, minOut);

        _tradeWithExecutor(userDetails_); 

        uint userTokens = IERC20(userDetails_.userToken).balanceOf(address(this));
        IERC20(userDetails_.userToken).safeTransfer(receiver_, userTokens); 
    } 
    

    function _depositFeesInDeFi(uint fee_, bool isRetry_) private { 
        emit DeadVariables(isRetry_);

        //Deposit WETH in Curve Tricrypto pool
        (uint tokenAmountIn, uint[3] memory amounts) = _calculateTokenAmountCurve(fee_);
        bool success = IERC20(s.WETH).approve(s.tricrypto, tokenAmountIn);
        assert(success);

        uint minAmount = ExecutorFacetTest(s.executor).calculateSlippage(tokenAmountIn, s.defaultSlippage);
        ITri(s.tricrypto).add_liquidity(amounts, minAmount);
            
        //Deposit crvTricrypto in Yearn
        success = IERC20(s.crvTricrypto).approve(s.yTriPool, IERC20(s.crvTricrypto).balanceOf(address(this))); 
        assert(success);

        IYtri(s.yTriPool).deposit(IERC20(s.crvTricrypto).balanceOf(address(this)));

        //Internal fees accounting
        if (s.failedFees > 0) s.failedFees = 0;
        s.feesVault += fee_;
    }


    function addTokenToDatabase(TradeOps memory newSwap_) external { 
        LibDiamond.enforceIsContractOwner();
        s.tokenDatabase[newSwap_.userToken] = true;
        s.swaps.push(newSwap_);
        emit NewUserToken(newSwap_.userToken);
    }


    /*******
        Helper functions
     ******/

    function _getFee(uint amount_) private view returns(uint, uint) {
        uint fee = amount_ - ExecutorFacetTest(s.executor).calculateSlippage(amount_, s.dappFee);
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

    function _calculateTokenAmountCurve(uint wethAmountIn_) private returns(uint, uint[3] memory) {
        uint[3] memory amounts;
        amounts[0] = 0;
        amounts[1] = 0;
        amounts[2] = wethAmountIn_;
        uint tokenAmount = ITri(s.tricrypto).calc_token_amount(amounts, true);
        return (tokenAmount, amounts);
    }
}