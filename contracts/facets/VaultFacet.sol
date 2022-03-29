//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import './ERC20Facet/IERC20Facet.sol';
import {ITricrypto} from '../interfaces/ICurve.sol';
// import '../libraries/Helpers.sol';
import '../interfaces/ICrvLpToken.sol';
import './ManagerFacet.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../AppStorage.sol';
import '../interfaces/IWETH.sol';

import '../HelpersAbs.sol';
import './ERC4626Facet/ERC4626Facet.sol';



contract VaultFacet { 

    AppStorage s;

    // using Helpers for uint256;

    // struct TokenLiq {
    //     uint amountIn;
    //     uint[2] biLiq;
    //     uint[3] triLiq;
    // }

    /**
    BTC: 1 / USDT: 0 / WETH: 2
     */

    function getTokenBalance(address token_) public view returns(uint balance) {
        balance = IERC20Facet(token_).balanceOf(address(this));
    }

    // function _calculateTokenAmountCurve(uint _wethAmountIn) private returns(uint, uint[3] memory) {
    //     uint[3] memory amounts;
    //     amounts[0] = 0;
    //     amounts[1] = 0;
    //     amounts[2] = _wethAmountIn;
    //     uint tokenAmount = s.tricrypto.calc_token_amount(amounts, true);
    //     return (tokenAmount, amounts);
    // } 
    

    // function depositCurveYearn(uint _fee) public payable {
    //     //Deposit WETH in Curve Tricrypto pool
    //     (uint tokenAmountIn, uint[3] memory amounts) = _calculateTokenAmountCurve(_fee);
    //     uint minAmount = calculateSlippage(tokenAmountIn, s.slippageOnCurve);
    //     s.WETH.approve(address(s.tricrypto), tokenAmountIn);
    //     s.tricrypto.add_liquidity(amounts, minAmount);

    //     //Deposit crvTricrypto in Yearn
    //     s.crvTricrypto.approve(address(s.yTriPool), s.crvTricrypto.balanceOf(address(this)));
    //     s.yTriPool.deposit(s.crvTricrypto.balanceOf(address(this)));
    // }

    function getTotalInUSD() public view returns(uint total) {
        uint virtualPrice = s.tricrypto.get_virtual_price();
        total = virtualPrice * s.crvTricrypto.balanceOf(address(this)); //divide between 10 ** 36 to get USD
    }

    // function getAllocationToAmount(uint shares_, uint _balance) public pure returns(uint ratio) {
    //     ratio = ((shares_ * _balance) / 100 * 1 ether) / 10 ** 36;
    // }
    

    // function calculateAllocationPercentage(uint shares_, uint balance_) public pure returns(uint) {
    //     return (((shares_ * 10000) / balance_) * 1 ether) / 100; //shares_ (amount passed by user) and balance are the same
    // }

    
    // function withdrawUserShare(address user_, uint shares_, address userToken_) public { //_userAllocation = shares_
    //     s.yTriPool.withdraw(s.yTriPool.balanceOf(address(this)));

    //     // uint vaultBalance = s.crvTricrypto.balanceOf(address(this));
    //     // uint assets = getAllocationToAmount(shares_, vaultBalance); //assets = userShareTokens ---- previewRedeem()

    //     // (bool success, bytes memory data) = address(s.PYY).delegatecall(
    //     //     abi.encodeWithSignature('balanceOf(address)', _user)
    //     // );
    //     // require(success, 'VaultFacet: balanceOfPYY failed');
    //     // (uint userBalancePYY) = abi.decode(data, (uint));

    //     // uint allocationPercentage = calculateAllocationPercentage(shares_, userBalancePYY);
    //     // uint amountToReduce = getAllocationToAmount(allocationPercentage, s.usersPayments[_user]);

    //     // (success, ) = address(s.manager).delegatecall(
    //     //     abi.encodeWithSignature(
    //     //         'modifyPaymentsAndVolumeExternally(address,uint256)', 
    //     //         _user, amountToReduce
    //     //     )
    //     // );
    //     // require(success, 'VaultFacet: modifyPaymentsAndVolumeExternally failed');

    //     uint assets = redeem(shares_, user_, user_);

    //     //tricrypto= USDT: 0 / crv2- USDT: 1 , USDC: 0 / mim- MIM: 0 , CRV2lp: 1
    //     uint tokenAmountIn = s.tricrypto.calc_withdraw_one_coin(assets, 0);
    //     uint minOut = calculateSlippage(tokenAmountIn, s.slippageOnCurve);
    //     s.tricrypto.remove_liquidity_one_coin(assets, 0, minOut);

    //     if (userToken_ == address(s.USDC)) { 
    //         executeFinalTrade(1, 0, s.USDT);
    //     } else if (userToken_ == address(s.MIM)) {
    //         executeFinalTrade(2, 0, s.USDT);
    //     } else if (userToken_ == address(s.FRAX)) {
    //         executeFinalTrade(2, 0, s.USDT, userToken_);
    //     }


    //     uint userTokens = IERC20Facet(userToken_).balanceOf(address(this));
    //     (bool success, ) = userToken_.call(
    //         abi.encodeWithSignature(
    //             'transfer(address,uint256)', 
    //             user_, userTokens 
    //         ) 
    //     );
    //     require(success, 'VaultFacet: call transfer() failed'); 
    // }

   

} 

