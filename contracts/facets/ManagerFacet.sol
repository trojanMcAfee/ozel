//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
// import {IRenPool, ITricrypto} from '../interfaces/ICurve.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './VaultFacet.sol';
import '../libraries/Helpers.sol';
import '../AppStorage.sol';
import '../interfaces/ICrvLpToken.sol';
import '../interfaces/IWETH.sol';
// import '../interfaces/IRen.sol';
import '../HelpersAbs.sol';

import 'hardhat/console.sol';

import './ERC4626Facet/ERC4626Facet.sol';




contract ManagerFacet is ERC4626Facet { 

    using SafeERC20 for IERC20;


   
    function transferUserAllocation(address _sender, address _receiver, uint _amount) public {
        uint amountToTransfer = _getAllocationToTransfer(_amount, _sender);
        s.usersPayments[_sender] -= amountToTransfer;
        s.usersPayments[_receiver] += amountToTransfer;
    }

    function _getAllocationToTransfer(uint _amount, address _user) public returns(uint) {
        (bool success, bytes memory returnData) = address(s.PYY).delegatecall(
            abi.encodeWithSignature('balanceOf(address)', _user)
        );
        require(success);
        (uint balancePYY) = abi.decode(returnData, (uint));
        
        uint percentageToTransfer = (_amount * 10000) / balancePYY;
        return (percentageToTransfer * s.usersPayments[_user]) / 10000;
    }

    function _getFee(uint amount_) public returns(uint, uint) {
        uint fee = amount_ - calculateSlippage(amount_, s.dappFee);
        s.feesVault += fee;
        uint netAmount = s.WETH.balanceOf(address(this)) - fee;
        return (netAmount, fee);
    }

    function swapsForUserToken(uint _amountIn, uint _baseTokenOut, address _userToken) public payable {
        uint minOut = s.tricrypto.get_dy(2, _baseTokenOut, _amountIn);
        uint slippage = calculateSlippage(minOut, s.slippageTradingCurve);
        s.WETH.approve(address(s.tricrypto), _amountIn);
        s.tricrypto.exchange(2, _baseTokenOut, _amountIn, slippage, false);

        if (_userToken == address(s.renBTC)) { 
            //renBTC: 1 / WBTC: 0
            executeFinalTrade(0, 1, s.WBTC);
        } else if (_userToken == address(s.MIM)) {
            //MIM: 0 / USDT: 2 / USDC: 1
            executeFinalTrade(2, 0, s.USDT);
        } else if (_userToken == address(s.USDC)) {
            //USDC: 0 / USDT: 1
            executeFinalTrade(1, 0, s.USDT);
        } else if (_userToken == address(s.FRAX)){
            //FRAX: 0 / USDT: 2 / USDC: 1
            executeFinalTrade(2, 0, s.USDT, _userToken);
        } 

    }

    /**
    BTC: 1 / USDT: 0 / WETH: 2
     */

    function exchangeToUserToken(address _user, address _userToken) external payable {
        uint baseTokenOut;

        s.WETH.deposit{value: msg.value}();
        uint wethIn = s.WETH.balanceOf(address(this));

        //deposits in ERC4626
        deposit(wethIn, _user);

        if (_userToken == address(s.WBTC) || _userToken == address(s.renBTC)) {
            baseTokenOut = 1;
        } else {
            baseTokenOut = 0;
        }

        //Sends fee to Vault contract
        (uint netAmountIn, uint fee) = _getFee(wethIn);
        
        //Swaps ETH to userToken (Base: USDT-WBTC / Route: MIM-USDC-renBTC-WBTC)  
        swapsForUserToken(netAmountIn, baseTokenOut, _userToken);
      
        //Sends userToken to user
        uint toUser = IERC20(_userToken).balanceOf(address(this));
        IERC20(_userToken).safeTransfer(_user, toUser);
        
        //Deposits fees in Curve's renPool
        depositCurveYearn(fee);
    }

    
    //*********** From VaultFacet ***********/


    function withdrawUserShare(address user_, uint shares_, address userToken_) public { 
        s.yTriPool.withdraw(s.yTriPool.balanceOf(address(this)));

        uint assets = redeem(shares_, user_, user_);

        //tricrypto= USDT: 0 / crv2- USDT: 1 , USDC: 0 / mim- MIM: 0 , CRV2lp: 1
        uint tokenAmountIn = s.tricrypto.calc_withdraw_one_coin(assets, 0); 
        uint minOut = calculateSlippage(tokenAmountIn, s.slippageOnCurve);
        s.tricrypto.remove_liquidity_one_coin(assets, 0, minOut);

        if (userToken_ == address(s.USDC)) { 
            executeFinalTrade(1, 0, s.USDT);
        } else if (userToken_ == address(s.MIM)) {
            executeFinalTrade(2, 0, s.USDT);
        } else if (userToken_ == address(s.FRAX)) {
            executeFinalTrade(2, 0, s.USDT, userToken_);
        }

        uint userTokens = IERC20Facet(userToken_).balanceOf(address(this));
        (bool success, ) = userToken_.call(
            abi.encodeWithSignature(
                'transfer(address,uint256)', 
                user_, userTokens 
            ) 
        );
        require(success, 'VaultFacet: call transfer() failed'); 
    }


    function _calculateTokenAmountCurve(uint _wethAmountIn) private returns(uint, uint[3] memory) {
        uint[3] memory amounts;
        amounts[0] = 0;
        amounts[1] = 0;
        amounts[2] = _wethAmountIn;
        uint tokenAmount = s.tricrypto.calc_token_amount(amounts, true);
        return (tokenAmount, amounts);
    } 
    

    function depositCurveYearn(uint _fee) public payable {
        //Deposit WETH in Curve Tricrypto pool
        (uint tokenAmountIn, uint[3] memory amounts) = _calculateTokenAmountCurve(_fee);
        uint minAmount = calculateSlippage(tokenAmountIn, s.slippageOnCurve);
        s.WETH.approve(address(s.tricrypto), tokenAmountIn);
        s.tricrypto.add_liquidity(amounts, minAmount);

        //Deposit crvTricrypto in Yearn
        s.crvTricrypto.approve(address(s.yTriPool), s.crvTricrypto.balanceOf(address(this)));
        s.yTriPool.deposit(s.crvTricrypto.balanceOf(address(this)));
    }

}