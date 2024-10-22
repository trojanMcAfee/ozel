// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import { LibDiamond } from "../../libraries/LibDiamond.sol";
import { ITri } from '../../interfaces/arbitrum/ICurve.sol';
import { ModifiersARB } from '../../arbitrum/Modifiers.sol';
import '../../arbitrum/facets/oz4626Facet.sol';
import '../../interfaces/arbitrum/IYtri.sol';
import '../../interfaces/common/IWETH.sol';
import '../../libraries/LibCommon.sol';
import './ExecutorFacetTest.sol';
import '../../Errors.sol';


contract OZLFacetTest is ModifiersARB {

    using SafeERC20 for IERC20;
    using Address for address;

    event NewToken(address token);
    event TokenRemoved(address token);
    event DeadVariables(bool isRetry);


    /*///////////////////////////////////////////////////////////////
                                Main
    //////////////////////////////////////////////////////////////*/  

    function exchangeToAccountToken(
        bytes memory accData_,
        uint amountToSend_,
        address account_ 
    ) external payable noReentrancy(0) { 
        (address user, address token, uint slippage) = _filter(accData_);

        if (msg.value <= 0) revert CantBeZero('msg.value');
        if (s.failedFees > 0) _depositFeesInDeFi(s.failedFees, true); 
        
        s.accountPayments[account_] += amountToSend_; 
        if (s.accountToUser[account_] == address(0)) s.accountToUser[account_] = user; 

        IWETH(s.WETH).deposit{value: msg.value}();
        uint wethIn = IWETH(s.WETH).balanceOf(address(this));
        wethIn = s.failedFees == 0 ? wethIn : wethIn - s.failedFees;

        //Mutex bitmap lock
        _toggleBit(1, 0);

        bytes memory data = abi.encodeWithSignature(
            'deposit(uint256,address,uint256)', 
            wethIn, user, 0
        );

        LibDiamond.callFacet(data);

        (uint netAmountIn, uint fee) = _getFee(wethIn);

        uint baseTokenOut = token == s.WBTC ? 1 : 0;

        /// @dev: Base tokens: USDT (route -> MIM-USDC-FRAX) / WBTC 
        _swapsForBaseToken(
            netAmountIn, baseTokenOut, slippage, user, token
        );
      
        uint toUser = IERC20(token).balanceOf(address(this));
        if (toUser > 0) IERC20(token).safeTransfer(user, toUser);

        _depositFeesInDeFi(fee, false);
    }


    
    function withdrawUserShare(
        bytes memory accData_,
        address receiver_,
        uint shares_
    ) external onlyWhenEnabled { 
        (address user, address token, uint slippage) = _filter(accData_);

        if (receiver_ == address(0)) revert CantBeZero('address');
        if (shares_ <= 0) revert CantBeZero('shares');

        //Queries if there are failed fees. If true, it deposits them
        if (s.failedFees > 0) _depositFeesInDeFi(s.failedFees, true);

        _toggleBit(1, 3);

        bytes memory data = abi.encodeWithSignature(
            'redeem(uint256,address,address,uint256)', 
            shares_, receiver_, user, 3
        );

        data = LibDiamond.callFacet(data);

        uint assets = abi.decode(data, (uint));
        IYtri(s.yTriPool).withdraw(assets);

        uint tokenAmountIn = ITri(s.tricrypto).calc_withdraw_one_coin(assets, 0); 
        
        uint minOut = ExecutorFacetTest(s.executor).calculateSlippage(
            tokenAmountIn, slippage
        ); 

        ITri(s.tricrypto).remove_liquidity_one_coin(assets, 0, minOut);

        _tradeWithExecutor(token, user, slippage); 

        uint userTokens = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(receiver_, userTokens); 
    } 
    

    function _depositFeesInDeFi(uint fee_, bool isRetry_) private { 
        emit DeadVariables(isRetry_);

        //Deposit WETH in Curve Tricrypto pool
        (uint tokenAmountIn, uint[3] memory amounts) = _calculateTokenAmountCurve(fee_);
        IERC20(s.WETH).approve(s.tricrypto, tokenAmountIn);

        uint minAmount = ExecutorFacetTest(s.executor).calculateSlippage(tokenAmountIn, s.defaultSlippage);
        ITri(s.tricrypto).add_liquidity(amounts, minAmount);
            
        //Deposit crvTricrypto in Yearn
        IERC20(s.crvTricrypto).approve(s.yTriPool, IERC20(s.crvTricrypto).balanceOf(address(this))); 
        IYtri(s.yTriPool).deposit(IERC20(s.crvTricrypto).balanceOf(address(this)));

        //Internal fees accounting
        if (s.failedFees > 0) s.failedFees = 0;
        s.feesVault += fee_;
    }

    /*///////////////////////////////////////////////////////////////
                        Secondary swap functions
    //////////////////////////////////////////////////////////////*/

    function _swapsForBaseToken(
        uint amountIn_, 
        uint baseTokenOut_, 
        uint slippage_,
        address user_,
        address token_
    ) private { 
        IERC20(s.WETH).approve(s.tricrypto, amountIn_);

        uint minOut = ITri(s.tricrypto).get_dy(2, baseTokenOut_, amountIn_);
        uint slippage = ExecutorFacetTest(s.executor).calculateSlippage(minOut, slippage_);
        
        ITri(s.tricrypto).exchange(2, baseTokenOut_, amountIn_, slippage, false);  
        uint baseBalance = IERC20(baseTokenOut_ == 0 ? s.USDT : s.WBTC).balanceOf(address(this));

        if ((token_ != s.USDT && token_ != s.WBTC) && baseBalance > 0) { 
            _tradeWithExecutor(token_, user_, slippage_);
        }
    }


    function _tradeWithExecutor(address token_, address user_, uint slippage_) private { 
        _toggleBit(1, 2);
        uint length = s.swaps.length;

        for (uint i=0; i < length;) {
            if (s.swaps[i].token == token_) {
                bytes memory data = abi.encodeWithSignature(
                    'executeFinalTrade((int128,int128,address,address,address),uint16,address,uint256)', 
                    s.swaps[i], slippage_, user_, 2
                );

                LibDiamond.callFacet(data);
                break;
            }
            unchecked { ++i; }
        }
    }

    /*///////////////////////////////////////////////////////////////
                        Token database config
    //////////////////////////////////////////////////////////////*/

    function addTokenToDatabase(
        TradeOps calldata newSwap_, 
        LibDiamond.Token calldata token_
    ) external { 
        LibDiamond.enforceIsContractOwner();
        address l2Address = token_.l2Address;
        address l1Address = token_.l1Address;

        if (s.tokenDatabase[l2Address]) revert TokenAlreadyInDatabase(l2Address);
        if (!s.l1Check && l1Address != s.nullAddress) revert L1TokenDisabled(l1Address);

        s.tokenDatabase[l2Address] = true;
        s.tokenL1ToTokenL2[l1Address] = l2Address;
        s.swaps.push(newSwap_);
        emit NewToken(l2Address);
    }

    
    function removeTokenFromDatabase(
        TradeOps calldata swapToRemove_, 
        LibDiamond.Token calldata token_
    ) external {
        LibDiamond.enforceIsContractOwner();
        address l2Address = token_.l2Address;
        if(!s.tokenDatabase[l2Address] && _l1TokenCheck(l2Address)) revert TokenNotInDatabase(l2Address);

        s.tokenDatabase[l2Address] = false;
        s.tokenL1ToTokenL2[token_.l1Address] = s.nullAddress;
        LibCommon.remove(s.swaps, swapToRemove_);
        emit TokenRemoved(l2Address);
    }

    /*///////////////////////////////////////////////////////////////
                                Helpers
    //////////////////////////////////////////////////////////////*/

    /// @dev Charges the system fee to the user's ETH (WETH internally) L1 transfer
    function _getFee(uint amount_) private view returns(uint, uint) {
        uint fee = amount_ - ExecutorFacetTest(s.executor).calculateSlippage(amount_, s.protocolFee);
        uint netAmount = amount_ - fee;
        return (netAmount, fee);
    }

    /// @dev Formats params needed for a specific Curve interaction
    function _calculateTokenAmountCurve(uint wethAmountIn_) private view returns(uint, uint[3] memory) {
        uint[3] memory amounts;
        amounts[0] = 0;
        amounts[1] = 0;
        amounts[2] = wethAmountIn_;
        uint tokenAmount = ITri(s.tricrypto).calc_token_amount(amounts, true);
        return (tokenAmount, amounts);
    }
}






