//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


// import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './ERC20Facet/IERC20Facet.sol';
import {ITricrypto} from '../interfaces/ICurve.sol';
import '../libraries/Helpers.sol';
import '../interfaces/ICrvLpToken.sol';
import './ManagerFacet.sol';

import '../AppStorage.sol';

import 'hardhat/console.sol';


contract VaultFacet { //Remember to write a function to withdraw/convert CRV 

    AppStorage internal s;

    using Helpers for uint256;

    /**
    BTC: 1 / USDT: 0 / WETH: 2
     */

    function getTokenBalance(address _token) public view returns(uint balance) {
        balance = IERC20Facet(_token).balanceOf(address(this));
    }

    function _calculateTokenAmountCurve(uint _wbtcAmountIn) private returns(uint, uint[3] memory) {
        uint[3] memory amounts;
        amounts[0] = 0;
        amounts[1] = _wbtcAmountIn;
        amounts[2] = 0;
        uint tokenAmount = s.tricrypto.calc_token_amount(amounts, true);
        return(tokenAmount, amounts);
    }

    function depositInCurve() public {
        uint wbtcAmountIn = s.WBTC.balanceOf(address(this));
        console.log('WBTC fees to be deposited in Curve: ', wbtcAmountIn);
        (uint tokenAmountIn, uint[3] memory amounts) = _calculateTokenAmountCurve(wbtcAmountIn);
        uint minAmount = tokenAmountIn._calculateSlippage(s.slippageOnCurve);

        s.WBTC.approve(address(s.tricrypto), tokenAmountIn);
        s.tricrypto.add_liquidity(amounts, minAmount);
        console.log('crvTricrypto token balance: ', s.crvTricrypto.balanceOf(address(this)));
    }

    function getTotalInUSD() public view returns(uint total) {
        uint virtualPrice = s.tricrypto.get_virtual_price();
        total = virtualPrice * s.crvTricrypto.balanceOf(address(this)); //divide between 10 ** 36 to get USD
    }

    function getAllocationToAmount(uint _userAllocation, uint _balance) public pure returns(uint) {
        return ((_userAllocation * _balance) / 100 * 1 ether) / 10 ** 36;
    }
    
    

    function calculateAllocationPercentage(uint _userAllocation, uint _balance) public pure returns(uint) {
        return (((_userAllocation * 10000) / _balance) * 1 ether) / 100;
    }


    
    function withdrawUserShare(address _user, uint _userAllocation, address _userToken) public {
        uint vaultBalance = s.crvTricrypto.balanceOf(address(this));
        uint userShareTokens = getAllocationToAmount(_userAllocation, vaultBalance);

        uint allocationPercentage = calculateAllocationPercentage(_userAllocation, s.PYY.balanceOf(_user));
        uint amountToReduce = getAllocationToAmount(allocationPercentage, s.usersPayments[_user]);
        s.manager.modifyPaymentsAndVolumeExternally(_user, amountToReduce);

        uint i;
        if (_userToken == address(s.USDT)) {
            i = 0;
        } else if (_userToken == address(s.WBTC)) {
            i = 1;
        } else if (_userToken == address(s.WETH)) {
            i = 2;
        }

        uint tokenAmountIn = s.tricrypto.calc_withdraw_one_coin(userShareTokens, i);
        uint minAmount = tokenAmountIn._calculateSlippage(s.slippageOnCurve);
        s.tricrypto.remove_liquidity_one_coin(userShareTokens, i, minAmount);

        uint userTokens = IERC20Facet(_userToken).balanceOf(address(this));
        (bool success, ) = _userToken.call(
            abi.encodeWithSignature(
                'transfer(address,uint256)', 
                _user, userTokens
            )
        );
        require(success, 'userToken transfer to user failed'); 
    }

    

} 

