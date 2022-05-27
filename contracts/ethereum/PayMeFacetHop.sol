//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


// import {
//     SafeERC20,
//     IERC20
// } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/utils/Address.sol';
import '../interfaces/IL1_ETH_Bridge.sol';
import '../interfaces/DelayedInbox.sol';
import './FakePYY.sol';
import './Emitter.sol';
import '../interfaces/IOps.sol';
import './StorageBeacon.sol';
import './ozUpgradeableBeacon.sol';
import '../libraries/FixedPointMathLib.sol';

import '@rari-capital/solmate/src/auth/authorities/RolesAuthority.sol';
import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';
import '@rari-capital/solmate/src/utils/SafeTransferLib.sol';
import '@rari-capital/solmate/src/tokens/ERC20.sol';

import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';


import 'hardhat/console.sol'; 


error CantBeZero(string nonZeroValue);
error CallFailed(string errorMsg);


contract PayMeFacetHop is ReentrancyGuard, Initializable { 
    using FixedPointMathLib for uint;

    StorageBeacon.UserConfig userDetails;
    StorageBeacon.FixedConfig fxConfig;

    address beacon;


    modifier onlyOps() {
        require(msg.sender == fxConfig.ops, "PayMeFacetHop: onlyOps");
        _;
    }

    modifier onlyUser() {
        require(msg.sender == userDetails.user, 'PayMeFacetHop: Not authorized');
        _;
    }

    function initialize(
        uint userId_, 
        address beacon_
    ) external initializer {
        userDetails = _getStorageBeacon(beacon_).getUserById(userId_);         
        fxConfig = _getStorageBeacon(beacon_).getFixedConfig();
        beacon = beacon_;
    }




    function _getStorageBeacon(address beacon_) private view returns(StorageBeacon) { 
        return StorageBeacon(ozUpgradeableBeacon(beacon_).storageBeacon());
    }



    function sendToArb( 
        StorageBeacon.VariableConfig memory varConfig_,
        StorageBeacon.UserConfig memory userDetails_
    ) external payable { //onlyOps
        if (userDetails_.user == address(0) || userDetails_.userToken == address(0)) revert CantBeZero('address');
        if (userDetails_.userSlippage <= 0) revert CantBeZero('slippage');

        bool isEmergency;

        bytes memory swapData = abi.encodeWithSelector(
            FakePYY(payable(fxConfig.PYY)).exchangeToUserToken.selector, 
            userDetails_
        );

        bytes memory ticketData = abi.encodeWithSelector(
            DelayedInbox(fxConfig.inbox).createRetryableTicket.selector, 
            fxConfig.PYY, 
            address(this).balance - varConfig_.autoRedeem, 
            varConfig_.maxSubmissionCost,  
            fxConfig.PYY, 
            fxConfig.PYY, 
            fxConfig.maxGas,  
            varConfig_.gasPriceBid, 
            swapData
        );


        (bool success, bytes memory returnData) = fxConfig.inbox.call{value: address(this).balance}(ticketData);
        if (!success) {
            (success, returnData) = fxConfig.inbox.call{value: address(this).balance}(ticketData); 
            if (!success) isEmergency =_runEmergencyMode();
        }

        if (isEmergency) {
            uint ticketID = abi.decode(returnData, (uint));
            console.log('ticketID: ', ticketID);
            // Emitter(fxConfig.emitter).forwardEvent(ticketID); 
        }

        (uint fee, ) = IOps(fxConfig.ops).getFeeDetails();
        _transfer(fee, fxConfig.ETH);
    }


    function _calculateMinOut(StorageBeacon.EmergencyMode memory eMode_, uint i_) private view returns(uint minOut) {
        (,int price,,,) = eMode_.priceFeed.latestRoundData();
        uint expectedOut = address(this).balance.mulDivDown(uint(price) * 10 ** 10, 1 ether);
        uint minOutUnprocessed = expectedOut - expectedOut.mulDivDown(userDetails.userSlippage * i_ * 100, 1000000); 
        minOut = minOutUnprocessed.mulWadDown(10 ** 6);
    }



    function _runEmergencyMode() private nonReentrant returns(bool) { //unsafe
        StorageBeacon.EmergencyMode memory eMode = _getStorageBeacon(beacon).getEmergencyMode();
        uint amountOut;

        for (uint i=1; i <= 2;) {
            ISwapRouter.ExactInputSingleParams memory params =
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: eMode.tokenIn,
                    tokenOut: eMode.tokenOut,
                    fee: eMode.poolFee,
                    recipient: userDetails.user,
                    deadline: block.timestamp,
                    amountIn: address(this).balance,
                    amountOutMinimum: _calculateMinOut(eMode, i), 
                    sqrtPriceLimitX96: 0
                });

            try eMode.swapRouter.exactInputSingle{value: address(this).balance}(params) returns(uint amountOutInternal) {
                amountOut = amountOutInternal;
                break;
            } catch {
                if (i == 1) {
                    unchecked { ++i; }
                    continue; 
                } else {
                    (bool success, ) = payable(userDetails.user).call{value: address(this).balance}('');
                    if (!success) revert CallFailed('PayMeFacetHop: ETH transfer failed');
                    unchecked { ++i; }
                }
            }
        } 
        return amountOut > 0;
    }





    function _transfer(uint256 _amount, address _paymentToken) private {
        if (_paymentToken == fxConfig.ETH) {
            (bool success, ) = fxConfig.gelato.call{value: _amount}("");
            if (!success) revert CallFailed("_transfer: ETH transfer failed");
        } else {
            SafeTransferLib.safeTransfer(ERC20(_paymentToken), fxConfig.gelato, _amount); 
        }
    }


    function changeUserToken(address newUserToken_) external onlyUser {
        userDetails.userToken = newUserToken_;
    }

    function changeUserSlippage(uint newUserSlippage_) external onlyUser {
        userDetails.userSlippage = newUserSlippage_;
    }

}







// import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

// contract PriceConsumerV3 {

//     AggregatorV3Interface internal priceFeed;

//     /**
//      * Network: Kovan
//      * Aggregator: ETH/USD
//      * Address: 0x9326BFA02ADD2366b30bacB125260Af641031331
//      */
//     constructor() {
//         priceFeed = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
//     }

//     /**
//      * Returns the latest price
//      */
//     function getLatestPrice() public view returns (int) {
//         (
//             /*uint80 roundID*/,
//             int price,
//             /*uint startedAt*/,
//             /*uint timeStamp*/,
//             /*uint80 answeredInRound*/
//         ) = priceFeed.latestRoundData();
//         return price;
//     }
// }



