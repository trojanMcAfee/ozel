// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '@openzeppelin/contracts/utils/Address.sol';
import '@rari-capital/solmate/src/utils/FixedPointMathLib.sol';
import '../AppStorage.sol';
import { ITri } from '../../interfaces/ICurve.sol';
import '../../interfaces/IYtri.sol';
import './DiamondLoupeFacet.sol';



contract ozLoupeFacet is DiamondLoupeFacet {

    AppStorage s;

    using FixedPointMathLib for uint;
    using Address for address;


    function queryTokenDatabase(address token_) external view returns(bool) {
        return s.tokenDatabase[token_];
    }

    function getOzelIndex() external view returns(uint) { 
        return s.ozelIndex;
    }

    function getRegulatorCounter() external view returns(uint) {
        return s.regulatorCounter;
    }

    function getTotalVolumeInETH() external view returns(uint) {
        return s.totalVolume;
    }

    function getTotalVolumeInUSD() external view returns(uint) {
        (,int price,,,) = s.priceFeed.latestRoundData();
        return (s.totalVolume * uint(price)) / 10 ** 8;
    }

    function getAUM(int price_) external view returns(uint yBalance, uint valueUM) { 
        (yBalance, ,valueUM) = _getAUM(price_);
    }

    function getAUM() public view returns(uint wethUM, uint valueUM) { 
        (,int price,,,) = s.priceFeed.latestRoundData();
        (, wethUM, valueUM) = _getAUM(price);
    }

    function getOzelBalances(address user_) external view returns(uint, uint) {       
        (uint wethUM, uint valueUM) = getAUM();

        bytes memory data = abi.encodeWithSignature('balanceOf(address)', user_);
        bytes memory returnData = address(this).functionStaticCall(data); 
        uint userOzlBalance = abi.decode(returnData, (uint));

        uint wethUserShare = _getUserShare(userOzlBalance, wethUM);
        uint usdUserShare = _getUserShare(userOzlBalance, valueUM);

        return (wethUserShare, usdUserShare);
    }

    function _getAUM(int price_) private view returns(uint, uint, uint) {
        uint yBalance = IYtri(s.yTriPool).balanceOf(address(this));
        uint priceShare = IYtri(s.yTriPool).pricePerShare();

        uint balanceCrv3 = (yBalance * priceShare) / 1 ether;
        uint wethUM = ITri(s.tricrypto).calc_withdraw_one_coin(balanceCrv3, 2);
        uint valueUM = (wethUM * uint(price_)) / 10 ** 8;
        return (yBalance, wethUM, valueUM);
    }

    function _getUserShare(
        uint userOzlBalance_, 
        uint amountUM_
    ) private pure returns(uint) {
        return userOzlBalance_.mulDivDown(amountUM_, 100 * 1 ether);
    }
}