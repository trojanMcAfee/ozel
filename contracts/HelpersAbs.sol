//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './AppStorage.sol';


abstract contract HelpersAbs {

    AppStorage internal s;

    function calculateSlippage(
        uint _amount, 
        uint _basisPoint
    ) internal pure returns(uint minAmountOut) {
        minAmountOut = _amount - ( (_amount * _basisPoint) / 10000 );  
    }


    function executeFinalTrade(int128 _tokenIn, int128 _tokenOut, IERC20 _contractIn) internal {
        uint minOut;
        uint slippage;
        uint inBalance = _contractIn.balanceOf(address(this));

        if (_tokenIn == 0) {
            minOut = s.renPool.get_dy(_tokenIn, _tokenOut, inBalance);
            slippage = calculateSlippage(minOut, s.slippageTradingCurve);
            s.renPool.exchange(_tokenIn, _tokenOut, inBalance, slippage);
        } else if (_tokenIn == 1) {
            minOut = s.crv2Pool.get_dy(_tokenIn, _tokenOut, inBalance);
            slippage = calculateSlippage(minOut, s.slippageTradingCurve);
            s.USDT.approve(address(s.crv2Pool), inBalance);
            s.crv2Pool.exchange(_tokenIn, _tokenOut, inBalance, slippage);
        } else if (_tokenIn == 2) {
            minOut = s.mimPool.get_dy_underlying(_tokenIn, _tokenOut, inBalance);
            slippage = calculateSlippage(minOut, s.slippageTradingCurve);
            s.USDT.approve(address(s.mimPool), inBalance);
            s.mimPool.exchange_underlying(_tokenIn, _tokenOut, inBalance, slippage);
        }
    }

    function executeFinalTrade(
        int128 tokenIn_, 
        int128 tokenOut_, 
        IERC20 contractIn_, 
        address userToken_
    ) internal {
        uint minOut;
        uint slippage;
        uint inBalance = contractIn_.balanceOf(address(this));

        if (userToken_ == address(s.FRAX)) {
            minOut = s.fraxPool.get_dy_underlying(tokenIn_, tokenOut_, inBalance);
            slippage = calculateSlippage(minOut, s.slippageTradingCurve);
            s.USDT.approve(address(s.fraxPool), inBalance);
            s.fraxPool.exchange_underlying(tokenIn_, tokenOut_, inBalance, slippage);
        } 

    }

    //****** Modifies manager's STATE *****/

    function updateManagerState(
        uint _amount, 
        address _user
    ) public {
        s.usersPayments[_user] += _amount;
        s.totalVolume += _amount;
        updateIndex();
    }

    function updateIndex() public { 
        s.distributionIndex = 
            s.totalVolume != 0 ? ((1 ether * 10 ** 8) / s.totalVolume) : 0;
    }

    function modifyPaymentsAndVolumeExternally(address _user, uint _newAmount) public {
        s.usersPayments[_user] -= _newAmount;
        s.totalVolume -= _newAmount;
        updateIndex();
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

    function transferUserAllocation(address _sender, address _receiver, uint _amount) public {
        uint amountToTransfer = _getAllocationToTransfer(_amount, _sender);
        s.usersPayments[_sender] -= amountToTransfer;
        s.usersPayments[_receiver] += amountToTransfer;
    }

}