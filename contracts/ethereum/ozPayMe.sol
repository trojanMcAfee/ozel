// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14; 


import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';
import '@rari-capital/solmate/src/utils/SafeTransferLib.sol';
// import '@rari-capital/solmate/src/tokens/ERC20.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '../libraries/FixedPointMathLib.sol';
import '../interfaces/DelayedInbox.sol';
import '../interfaces/IWETH.sol';
import '../interfaces/IOps.sol';
import './FakeOZL.sol';
import './Emitter.sol';
import './StorageBeacon.sol';
import './ozUpgradeableBeacon.sol';
import '../Errors.sol';

import '../libraries/ozERC20Lib.sol';
import { ModifiersETH } from '../Modifiers.sol';

import 'hardhat/console.sol'; 


contract ozPayMe is ModifiersETH, ReentrancyGuard, Initializable { 

    using FixedPointMathLib for uint;
    using ozERC20Lib for IERC20;

    address private _beacon;

    event FundsToArb(address indexed sender, uint amount);
    event EmergencyTriggered(address indexed sender, uint amount);
    event NewUserToken(address indexed user, address indexed newToken);
    event NewUserSlippage(address indexed user, uint indexed newSlippage);
    event FailedERCFunds(address indexed user_, uint indexed amount_);


    function initialize(
        uint userId_, 
        address beacon_
    ) external initializer {
        userDetails = StorageBeacon(_getStorageBeacon(beacon_, 0)).getUserDetailsById(userId_);  
        fxConfig = StorageBeacon(_getStorageBeacon(beacon_, 0)).getFixedConfig();
        _beacon = beacon_;
    }


    function _getStorageBeacon(address beacon_, uint version_) private view returns(address) { 
        return ozUpgradeableBeacon(beacon_).storageBeacon(version_);
    }


    function sendToArb( 
        StorageBeacon.VariableConfig calldata varConfig_,
        StorageBeacon.UserConfig calldata userDetails_
    ) external payable onlyOps { 
        console.log(10);

        StorageBeacon storageBeacon = StorageBeacon(_getStorageBeacon(_beacon, 0)); 

        console.log(103);

        if (userDetails_.user == address(0) || userDetails_.userToken == address(0)) revert CantBeZero('address');
        console.log(1031);
        console.log(storageBeacon.isUser(userDetails_.user));
        console.log('user: ', userDetails_.user);
        if (!(storageBeacon.isUser(userDetails_.user))) revert UserNotInDatabase(userDetails_.user);
        console.log(1032);
        if (!(storageBeacon.queryTokenDatabase(userDetails_.userToken))) revert TokenNotInDatabase(userDetails_.userToken);
        console.log(1033);
        if (userDetails_.userSlippage <= 0) revert CantBeZero('slippage');
        console.log(1034);
        if (!(address(this).balance > 0)) revert CantBeZero('contract balance');

        console.log(104);

        (uint fee, ) = IOps(fxConfig.ops).getFeeDetails();
        _transfer(fee, fxConfig.ETH);

        console.log(105);

        bool isEmergency = false;

        bytes memory swapData = abi.encodeWithSelector(
            FakeOZL(payable(fxConfig.OZL)).exchangeToUserToken.selector, 
            userDetails_
        );

        console.log(106);

        bytes memory ticketData = abi.encodeWithSelector(
            DelayedInbox(fxConfig.inbox).createRetryableTicket.selector, 
            fxConfig.OZL, 
            address(this).balance - varConfig_.autoRedeem,
            varConfig_.maxSubmissionCost,  
            fxConfig.OZL, 
            fxConfig.OZL, 
            fxConfig.maxGas,  
            varConfig_.gasPriceBid, 
            swapData
        );

        console.log(100);
        uint amountToSend = address(this).balance;
        console.log(101);
        (bool success, bytes memory returnData) = fxConfig.inbox.call{value: address(this).balance}(ticketData);
        console.log(11);
        if (!success) {
            console.log(12);
            (success, returnData) = fxConfig.inbox.call{value: address(this).balance}(ticketData); 
            if (!success) { 
                console.log(13);
                emit EmergencyTriggered(userDetails_.user, amountToSend);
                _runEmergencyMode();
                isEmergency = true;
            }
        }

        if (!isEmergency) {
            emit FundsToArb(userDetails_.user, amountToSend);
            
            if (!storageBeacon.getEmitterStatus()) { 
                uint ticketID = abi.decode(returnData, (uint));
                Emitter(fxConfig.emitter).forwardEvent(ticketID); 
            }
        }
    }


    function _calculateMinOut(
        StorageBeacon.EmergencyMode memory eMode_, 
        uint i_,
        uint balanceWETH_
    ) private view returns(uint minOut) {
        (,int price,,,) = eMode_.priceFeed.latestRoundData();
        uint expectedOut = balanceWETH_.mulDivDown(uint(price) * 10 ** 10, 1 ether);
        uint minOutUnprocessed = 
            expectedOut - expectedOut.mulDivDown(userDetails.userSlippage * i_ * 100, 1000000); 
        minOut = minOutUnprocessed.mulWadDown(10 ** 6);
    }



    function _runEmergencyMode() private nonReentrant { 
        console.log(1);

        address sBeacon = _getStorageBeacon(_beacon, 0);
        StorageBeacon.EmergencyMode memory eMode = StorageBeacon(sBeacon).getEmergencyMode();
        
        IWETH(eMode.tokenIn).deposit{value: address(this).balance}();
        uint balanceWETH = IWETH(eMode.tokenIn).balanceOf(address(this));

        bool success = IERC20(eMode.tokenIn).ozApprove(
            address(eMode.swapRouter), userDetails.user, balanceWETH, sBeacon
        );

        if (success) {
            console.log(2);
            for (uint i=1; i <= 2;) {
                ISwapRouter.ExactInputSingleParams memory params =
                    ISwapRouter.ExactInputSingleParams({
                        tokenIn: eMode.tokenIn,
                        tokenOut: eMode.tokenOut, 
                        fee: eMode.poolFee,
                        recipient: userDetails.user,
                        deadline: block.timestamp,
                        amountIn: balanceWETH,
                        amountOutMinimum: _calculateMinOut(eMode, i, balanceWETH), 
                        sqrtPriceLimitX96: 0
                    });

                try eMode.swapRouter.exactInputSingle(params) { 
                    console.log(3);
                    break; 
                } catch {
                    if (i == 1) {
                        unchecked { ++i; }
                        continue; 
                    } else {
                        IERC20(eMode.tokenIn).ozTransfer(userDetails.user, balanceWETH, sBeacon);
                        break;
                    }
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
        StorageBeacon storageBeacon = StorageBeacon(_getStorageBeacon(_beacon, 0)); 

        if (newUserToken_ == address(0)) revert CantBeZero('address');
        if (!storageBeacon.queryTokenDatabase(newUserToken_)) revert TokenNotInDatabase(newUserToken_);

        userDetails.userToken = newUserToken_;
        emit NewUserToken(msg.sender, newUserToken_);
    }


    function changeUserSlippage(uint newUserSlippage_) external onlyUser {
        if (newUserSlippage_ <= 0) revert CantBeZero('slippage');
        userDetails.userSlippage = newUserSlippage_;
        emit NewUserSlippage(msg.sender, newUserSlippage_);
    } 
}







