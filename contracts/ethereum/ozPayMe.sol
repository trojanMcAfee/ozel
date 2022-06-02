//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14; 


// import {
//     SafeERC20,
//     IERC20
// } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/access/Ownable.sol';
// import '@openzeppelin/contracts/utils/Address.sol';
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

import './Errors.sol';

import 'hardhat/console.sol'; 




contract ozPayMe is ReentrancyGuard, Initializable { 
    using FixedPointMathLib for uint;

    StorageBeacon.UserConfig userDetails;
    StorageBeacon.FixedConfig fxConfig;

    address private beacon;

    bool isEmitter;

    event FundsToArb(address indexed sender, uint amount);
    event EmergencyTriggered(address indexed sender, uint amount);
    event NewUserToken(address indexed user, address indexed newToken);
    event NewUserSlippage(address indexed user, uint indexed newSlippage);


    modifier onlyOps() {
        require(msg.sender == fxConfig.ops, "ozPayMe: onlyOps");
        _;
    }

    modifier onlyUser() {
        require(msg.sender == userDetails.user, 'ozPayMe: Not authorized');
        _;
    }

    modifier hasRole(bytes4 functionSig_) {
        require(ozUpgradeableBeacon(beacon).canCall(msg.sender, address(this), functionSig_));
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
        return ozUpgradeableBeacon(beacon_).storageBeacon();
    }


    function sendToArb( 
        StorageBeacon.VariableConfig memory varConfig_,
        StorageBeacon.UserConfig memory userDetails_
    ) external payable onlyOps { //onlyOps
        if (userDetails_.user == address(0) || userDetails_.userToken == address(0)) revert CantBeZero('address');
        if (!_getStorageBeacon(beacon).isUser(userDetails_.user)) revert NotFoundInDatabase('user');
        if (userDetails_.userSlippage <= 0) revert CantBeZero('slippage');
        if (!(address(this).balance > 0)) revert CantBeZero('contract balance');

        (uint fee, ) = IOps(fxConfig.ops).getFeeDetails();
        _transfer(fee, fxConfig.ETH);

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

        uint amountToSend = address(this).balance;
        (bool success, bytes memory returnData) = fxConfig.inbox.call{value: address(this).balance}(ticketData);
        if (!success) {
            console.log(1);
            (success, returnData) = fxConfig.inbox.call{value: address(this).balance}(ticketData); 
            if (!success) {
                _runEmergencyMode();
                isEmergency = true;
                emit EmergencyTriggered(userDetails_.user, amountToSend);
            }
        }


        if (!isEmergency) {
            if (!isEmitter) { 
                uint ticketID = abi.decode(returnData, (uint));
                Emitter(fxConfig.emitter).forwardEvent(ticketID); //when testing, add a way to turn this off (through isEmer ? )
            }
            emit FundsToArb(userDetails_.user, amountToSend);
        }

    }


    function _calculateMinOut(StorageBeacon.EmergencyMode memory eMode_, uint i_) private view returns(uint minOut) {
        (,int price,,,) = eMode_.priceFeed.latestRoundData();
        uint expectedOut = address(this).balance.mulDivDown(uint(price) * 10 ** 10, 1 ether);
        uint minOutUnprocessed = expectedOut - expectedOut.mulDivDown(userDetails.userSlippage * i_ * 100, 1000000); 
        minOut = minOutUnprocessed.mulWadDown(10 ** 6);
    }



    function _runEmergencyMode() private nonReentrant { //unsafe
        StorageBeacon.EmergencyMode memory eMode = _getStorageBeacon(beacon).getEmergencyMode();

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

            try eMode.swapRouter.exactInputSingle{value: address(this).balance}(params) {
                break;
            } catch {
                if (i == 1) {
                    unchecked { ++i; }
                    continue; 
                } else {
                    (bool success, ) = payable(userDetails.user).call{value: address(this).balance}('');
                    if (!success) revert CallFailed('ozPayMe: ETH transfer failed');
                    unchecked { ++i; }
                }
            }
        } 
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
        emit NewUserToken(msg.sender, newUserToken_);
    }

    function changeUserSlippage(uint newUserSlippage_) external onlyUser {
        userDetails.userSlippage = newUserSlippage_;
        emit NewUserSlippage(msg.sender, newUserSlippage_);
    }

    function disableEmitter() external hasRole(0xa2d4d48b) {
        isEmitter = true;
    }


}







