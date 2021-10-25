//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {ITricrypto} from './interfaces/ICurve.sol';
import './libraries/Helpers.sol';
import './interfaces/ICrvLpToken.sol';
import './Manager.sol';

import 'hardhat/console.sol';


contract Vault {

    using Helpers for uint256;

    IERC20 renBTC = IERC20(0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D);
    IERC20 WBTC = IERC20(0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599);
    ITricrypto tricrypto = ITricrypto(0xD51a44d3FaE010294C616388b506AcdA1bfAAE46);
    ICrvLpToken crvTricrypto = ICrvLpToken(0xc4AD29ba4B3c580e6D59105FFf484999997675Ff);
    IERC20 USDT = IERC20(0xdAC17F958D2ee523a2206206994597C13D831ec7);
    IERC20 WETH = IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    Manager manager;
    uint slippageOnCurve = 100; //bp: 100 -> 1%
    IERC20 PYY;

    /**
    BTC: 1 / USDT: 0 / WETH: 2
     */

    function setManager(address _manager) external {
        manager = Manager(_manager);
    }

    function setPYY(address _pyy) public {
        PYY = IERC20(_pyy);
    }




    function getTokenBalance(address _token) public view returns(uint balance) {
        balance = IERC20(_token).balanceOf(address(this));
    }

    function _calculateTokenAmountCurve(uint _wbtcAmountIn) private returns(uint, uint[3] memory) {
        uint[3] memory amounts;
        amounts[0] = 0;
        amounts[1] = _wbtcAmountIn;
        amounts[2] = 0;
        uint tokenAmount = tricrypto.calc_token_amount(amounts, true);
        return(tokenAmount, amounts);
    }

    function depositInCurve() public {
        uint wbtcAmountIn = WBTC.balanceOf(address(this));
        console.log('WBTC fees to be deposited in Curve: ', wbtcAmountIn);
        (uint tokenAmountIn, uint[3] memory amounts) = _calculateTokenAmountCurve(wbtcAmountIn);
        uint minAmount = tokenAmountIn._calculateSlippage(slippageOnCurve);

        WBTC.approve(address(tricrypto), tokenAmountIn);
        tricrypto.add_liquidity(amounts, minAmount);
        console.log('crvTricrypto token balance: ', crvTricrypto.balanceOf(address(this)));
    }

    function getTotalInUSD() public view returns(uint total) {
        uint virtualPrice = tricrypto.get_virtual_price();
        total = virtualPrice * crvTricrypto.balanceOf(address(this)); //divide between 10 ** 36 to get USD
    }

    function getAllocationToAmount(uint _userAllocation, uint _balance) public pure returns(uint) {
        return ((_userAllocation * _balance) / 100 * 1 ether) / 10 ** 36;
    }
    
    

    function calculateAllocationPercentage(uint _userAllocation, uint _balance) public pure returns(uint) {
        return (((_userAllocation * 10000) / _balance) * 1 ether) / 100;
    }


    
    function withdrawUserShare(address _user, uint _userAllocation, address _userToken) public {
        uint vaultBalance = crvTricrypto.balanceOf(address(this));
        uint userShareTokens = getAllocationToAmount(_userAllocation, vaultBalance);

        uint allocationPercentage = calculateAllocationPercentage(_userAllocation, PYY.balanceOf(_user));
        uint amountToReduce = getAllocationToAmount(allocationPercentage, manager.usersPayments(_user));
        manager.modifyPaymentsAndVolumeExternally(_user, amountToReduce);

        uint i;
        if (_userToken == address(USDT)) {
            i = 0;
        } else if (_userToken == address(WBTC)) {
            i = 1;
        } else if (_userToken == address(WETH)) {
            i = 2;
        }

        uint tokenAmountIn = tricrypto.calc_withdraw_one_coin(userShareTokens, i);
        uint minAmount = tokenAmountIn._calculateSlippage(slippageOnCurve);
        tricrypto.remove_liquidity_one_coin(userShareTokens, i, minAmount);

        uint userTokens = IERC20(_userToken).balanceOf(address(this));
        (bool success, ) = _userToken.call(
            abi.encodeWithSignature(
                'transfer(address,uint256)', 
                _user, userTokens
            )
        );
        require(success, 'userToken transfer to user failed'); 
    }

    

} 

