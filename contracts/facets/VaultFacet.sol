//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import './ERC20Facet/IERC20Facet.sol';
import {ITricrypto} from '../interfaces/ICurve.sol';
import '../libraries/Helpers.sol';
import '../interfaces/ICrvLpToken.sol';
import './ManagerFacet.sol';

import '../AppStorage.sol';
import '../interfaces/IWETH.sol';



contract VaultFacet { 

    AppStorage s;

    using Helpers for uint256;

    /**
    BTC: 1 / USDT: 0 / WETH: 2
     */

    function getTokenBalance(address _token) public view returns(uint balance) {
        balance = IERC20Facet(_token).balanceOf(address(this));
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
        uint minAmount = tokenAmountIn._calculateSlippage(s.slippageOnCurve);
        s.WETH.approve(address(s.tricrypto), tokenAmountIn);
        s.tricrypto.add_liquidity(amounts, minAmount);

        //Deposit crvTricrypto in Yearn
        s.crvTricrypto.approve(address(s.yTriPool), s.crvTricrypto.balanceOf(address(this)));
        s.yTriPool.deposit(s.crvTricrypto.balanceOf(address(this)));
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
        s.yTriPool.withdraw(s.yTriPool.balanceOf(address(this)));
        uint vaultBalance = s.crvTricrypto.balanceOf(address(this));
        uint userShareTokens = getAllocationToAmount(_userAllocation, vaultBalance);

        (bool success, bytes memory data) = address(s.PYY).delegatecall(
            abi.encodeWithSignature('balanceOf(address)', _user)
        );
        require(success, 'VaultFacet: balanceOfPYY failed');
        (uint userBalancePYY) = abi.decode(data, (uint));

        uint allocationPercentage = calculateAllocationPercentage(_userAllocation, userBalancePYY);
        uint amountToReduce = getAllocationToAmount(allocationPercentage, s.usersPayments[_user]);

        (success, ) = address(s.manager).delegatecall(
            abi.encodeWithSignature(
                'modifyPaymentsAndVolumeExternally(address,uint256)', 
                _user, amountToReduce
            )
        );
        require(success, 'VaultFacet: modifyPaymentsAndVolumeExternally failed');

        uint i; //crv2- USDT: 1 , USDC: 0 / mim- MIM: 0 , CRV2lp: 1
        uint tokenAmountIn;
        uint minAmount;
        address curvePool;
        if (_userToken == address(s.USDT)) { 
            i = 0; 
        } else if (_userToken == address(s.WETH)) {
            i = 2;
        }

        uint tokenAmountIn = s.tricrypto.calc_withdraw_one_coin(userShareTokens, i); //grab these three, put them into a func and then on each if block
        uint minAmount = tokenAmountIn._calculateSlippage(s.slippageOnCurve);
        s.tricrypto.remove_liquidity_one_coin(userShareTokens, i, minAmount);

        uint userTokens = IERC20Facet(_userToken).balanceOf(address(this));
        (success, ) = _userToken.call(
            abi.encodeWithSignature(
                'transfer(address,uint256)', 
                _user, userTokens 
            ) 
        );
        require(success, 'VaultFacet: call transfer() failed'); 
    }

} 

