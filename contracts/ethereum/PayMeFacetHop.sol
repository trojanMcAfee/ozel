//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import {
    SafeERC20,
    IERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
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

import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';

// import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import 'hardhat/console.sol'; 


contract PayMeFacetHop is Initializable { 
    using Address for address;
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
    ) external payable { //onlyOps ---- add reentracyGuard here later (?)
        require(userDetails_.user != address(0) && userDetails_.userToken != address(0), 'PayMeFacet: User addresses cannnot be 0');
        require(userDetails_.userSlippage > 0, 'PayMeFacet: User slippage cannot be 0');

        address inbox = fxConfig.inbox;
        address PYY = fxConfig.PYY;
        address emitter = fxConfig.emitter;
        address opsGel = fxConfig.ops;
        address ETH = fxConfig.ETH;
        uint maxGas = fxConfig.maxGas;

        uint maxSubmissionCost = varConfig_.maxSubmissionCost;
        uint gasPriceBid = varConfig_.gasPriceBid;
        uint autoRedeem = varConfig_.autoRedeem;

        bool isEmergency;


        bytes memory swapData = abi.encodeWithSelector(
            FakePYY(payable(PYY)).exchangeToUserToken.selector, 
            userDetails_
        );

        bytes memory ticketData = abi.encodeWithSelector(
            DelayedInbox(inbox).createRetryableTicket.selector, 
            PYY, 
            address(this).balance - autoRedeem, 
            maxSubmissionCost,  
            PYY, 
            PYY, 
            maxGas,  
            gasPriceBid, 
            swapData
        );


        //  try bytes memory returnData = inbox.functionCallWithValue(ticketData, address(this).balance) {
             
        //  }

        (bool success, bytes memory returnData) = inbox.call{value: address(this).balance}(''); //ticketData
        if (!success) {
            console.log('on second attempt');
            (success, returnData) = inbox.call{value: address(this).balance}(''); //ticketData
            if (!success) {
                console.log('on third attempt');
                isEmergency =_runEmergencyMode();
            }
        }

        if (!isEmergency) {
            uint ticketID = abi.decode(returnData, (uint));
            console.log('ticketID: ', ticketID);
            // Emitter(emitter).forwardEvent(ticketID); 
        }

        (uint fee, ) = IOps(opsGel).getFeeDetails();
        _transfer(fee, ETH);
    }


    function _calculateMinOut(StorageBeacon.EmergencyMode memory eMode_, uint i_) private view returns(uint minOut) {
        (,int price,,,) = eMode_.priceFeed.latestRoundData();
        uint expectedOut = address(this).balance.mulDivDown(uint(price) * 10 ** 10, 1 ether);
        uint minOutUnprocessed = expectedOut - expectedOut.mulDivDown(userDetails.userSlippage * i_ * 100, 1000000); //200: userDetails.userSlippage * i_
        minOut = minOutUnprocessed.mulWadDown(10 ** 6);
    }



    function _runEmergencyMode() private returns(bool) { //unsafe - reentrancyGuard
        StorageBeacon.EmergencyMode memory eMode = _getStorageBeacon(beacon).getEmergencyMode();
        uint amountOut;

        for (uint i=1; i <= 2; i++) {
            console.log('hey2');
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

            console.log('hi');
            try eMode.swapRouter.exactInputSingle{value: address(this).balance}(params) returns(uint amountOutInternal) {
                console.log('success at try ', i);
                amountOut = amountOutInternal;
                break;
            } catch {
                console.log('failed at try', i);
                if (i == 1) {
                    continue; //<---- error here
                } else {
                    userDetails.user.functionCallWithValue('', address(this).balance);
                }
            }
        } 

        return amountOut > 0;
    }





    function _transfer(uint256 _amount, address _paymentToken) private {
        address gelato = fxConfig.gelato;
        address ETH = fxConfig.ETH;

        if (_paymentToken == ETH) {
            (bool success, ) = gelato.call{value: _amount}("");
            require(success, "_transfer: ETH transfer failed");
        } else {
            SafeERC20.safeTransfer(IERC20(_paymentToken), gelato, _amount);
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



