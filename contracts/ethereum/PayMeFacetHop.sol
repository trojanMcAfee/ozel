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

    function calculateSlippage(
        uint amount_, 
        uint basisPoint_
    ) public pure returns(uint minAmountOut) {
        minAmountOut = amount_ - amount_.mulDivDown(basisPoint_, 10000);
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

                // StorageBeacon.EmergencyMode memory eMode = _getStorageBeacon(beacon).getEmergencyMode();
                // address WETH = eMode.tokenIn;
                // address USDC = eMode.tokenOut;
                // uint24 poolFee = eMode.poolFee;
                // console.log('WETH: ', WETH);

                // uint amountOutMinimum = calculateSlippage(address(this).balance, userDetails.userSlippage);

                // console.log(1);
                // ISwapRouter.ExactInputSingleParams memory params =
                //     ISwapRouter.ExactInputSingleParams({
                //         tokenIn: WETH,
                //         tokenOut: USDC,
                //         fee: eMode.poolFee,
                //         recipient: userDetails.user,
                //         deadline: block.timestamp,
                //         amountIn: address(this).balance,
                //         amountOutMinimum: 0,
                //         sqrtPriceLimitX96: 0
                //     });


                // uint amountOut = eMode.swapRouter.exactInputSingle{value: address(this).balance}(params);
                // console.log('amountOut: ****', amountOut);
                // _transfer(fee, ETH);

                // return;

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



    function _runEmergencyMode() private returns(bool) {
        StorageBeacon.EmergencyMode memory eMode = _getStorageBeacon(beacon).getEmergencyMode();
        address WETH = eMode.tokenIn;
        address USDC = eMode.tokenOut;
        uint24 poolFee = eMode.poolFee;
        console.log('WETH: ', WETH);

        uint amountOutMinimum = calculateSlippage(address(this).balance, userDetails.userSlippage);

        console.log(1);
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: WETH,
                tokenOut: USDC,
                fee: poolFee,
                recipient: userDetails.user,
                deadline: block.timestamp,
                amountIn: address(this).balance,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });


        uint amountOut = eMode.swapRouter.exactInputSingle{value: address(this).balance}(params);
        console.log('amountOut: ****', amountOut);

        return amountOut > 0;
        // _transfer(fee_, eth_);

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





