// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '@openzeppelin/contracts/utils/Address.sol';
import '@rari-capital/solmate/src/utils/FixedPointMathLib.sol';
import { ITri } from '../../interfaces/arbitrum/ICurve.sol';
import '../../interfaces/arbitrum/ozILoupeFacet.sol';
import '../../interfaces/arbitrum/IYtri.sol';
import './DiamondLoupeFacet.sol';
import '../AppStorage.sol';


/**
 * @dev Main view methods that query key components, showing the financial statistics
 * of the system and its equilibrum. 
 */
contract ozLoupeFacet is ozILoupeFacet, DiamondLoupeFacet {

    AppStorage s;

    using FixedPointMathLib for uint;
    using Address for address;

    /// @inheritdoc ozILoupeFacet
    function queryTokenDatabase(address token_) external view returns(bool) {
        return s.tokenDatabase[token_];
    }

    /// @inheritdoc ozILoupeFacet
    function getOzelIndex() external view returns(uint) { 
        return s.ozelIndex;
    }

    /// @inheritdoc ozILoupeFacet
    function getRegulatorCounter() external view returns(uint) {
        return s.regulatorCounter;
    }

    /// @inheritdoc ozILoupeFacet
    function getTotalVolumeInETH() external view returns(uint) {
        return s.totalVolume;
    }

    /// @inheritdoc ozILoupeFacet
    function getTotalVolumeInUSD() external view returns(uint) {
        (,int price,,,) = s.priceFeed.latestRoundData();
        return (s.totalVolume * uint(price)) / 10 ** 8;
    }

    /// @inheritdoc ozILoupeFacet
    function getAUM(int price_) external view returns(uint yBalance, uint valueUM) { 
        (yBalance, ,valueUM) = _getAUM(price_);
    }

    /// @dev Overloaded -and public- version of _getAUM()
    function getAUM() public view returns(uint wethUM, uint valueUM) { 
        (,int price,,,) = s.priceFeed.latestRoundData();
        (, wethUM, valueUM) = _getAUM(price);
    }

    /// @inheritdoc ozILoupeFacet
    function getOzelBalances(address user_) external view returns(uint, uint) {       
        (uint wethUM, uint valueUM) = getAUM();

        bytes memory data = abi.encodeWithSignature('balanceOf(address)', user_);
        bytes memory returnData = address(this).functionStaticCall(data); 
        uint userOzlBalance = abi.decode(returnData, (uint));

        uint wethUserShare = _getUserShare(userOzlBalance, wethUM);
        uint usdUserShare = _getUserShare(userOzlBalance, valueUM);

        return (wethUserShare, usdUserShare);
    }

    /**
     * @notice Calculates the AUM (Assets Under Management) of the system.
     * @dev At the current version, they (AUM) are all the fees charged in every incoming 
     * L1 transfer from each account created by an user.
     * @param price_ Current ETHUSD price feed (Chainlink)
     * @return yBalance AUM expressed in yToken
     * @return wethUM AUM expressed in WETH
     * @return valueUM AUM expressed in USD
     */
    function _getAUM(int price_) private view returns(uint, uint, uint) {
        uint yBalance = IYtri(s.yTriPool).balanceOf(address(this));
        uint priceShare = IYtri(s.yTriPool).pricePerShare();

        uint balanceCrv3 = (yBalance * priceShare) / 1 ether;
        uint wethUM = ITri(s.tricrypto).calc_withdraw_one_coin(balanceCrv3, 2);
        uint valueUM = (wethUM * uint(price_)) / 10 ** 8;
        return (yBalance, wethUM, valueUM);
    }

    /**
     * @dev Gets the user's share of AUM depending on their OZL balance
     * @param userOzlBalance_ User's OZL balance
     * @param amountUM_ AUM
     */
    function _getUserShare(
        uint userOzlBalance_, 
        uint amountUM_
    ) private pure returns(uint) {
        return userOzlBalance_.mulDivDown(amountUM_, 100 * 1 ether);
    }

    function getProtocolFee() external view returns(uint) {
        return s.dappFee; 
    }
}