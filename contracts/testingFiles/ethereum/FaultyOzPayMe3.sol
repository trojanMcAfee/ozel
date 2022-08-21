// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14; 


import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';
import '@rari-capital/solmate/src/utils/SafeTransferLib.sol';
import '@rari-capital/solmate/src/tokens/ERC20.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '../../libraries/FixedPointMathLib.sol';
import '../../interfaces/DelayedInbox.sol';
import '../../interfaces/IOps.sol';
import '../../interfaces/IWETH.sol';
import '../../ethereum/FakeOZL.sol';
import '../../ethereum/Emitter.sol';
import '../../ethereum/StorageBeacon.sol';
import '../../ethereum/ozUpgradeableBeacon.sol';
import '../../Errors.sol';

import '../../libraries/ForTesting/FaultyOzERC20Lib.sol';
import { ModifiersETH } from '../../Modifiers.sol';

import 'hardhat/console.sol'; 


contract FaultyOzPayMe3 is ModifiersETH, ReentrancyGuard, Initializable { 

    using FixedPointMathLib for uint;
    using FaultyOzERC20Lib for IERC20;

    StorageBeacon.UserConfig userDetails;
    StorageBeacon.FixedConfig fxConfig;

    address private _beacon;

    event FundsToArb(address indexed sender, uint amount);
    event EmergencyTriggered(address indexed sender, uint amount);
    event NewUserToken(address indexed user, address indexed newToken);
    event NewUserSlippage(address indexed user, uint indexed newSlippage);
    event FailedERCFunds(address indexed user_, uint indexed amount_);

    //Custom event that checks for the second attempt on EmergencyMode
    event SecondAttempt(uint success);

    modifier onlyOps() {
        if (msg.sender != fxConfig.ops) revert NotAuthorized(msg.sender);
        _;
    }

    modifier onlyUser() {
        if (msg.sender != userDetails.user) revert NotAuthorized(msg.sender);
        _;
    }


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
        StorageBeacon storageBeacon = StorageBeacon(_getStorageBeacon(_beacon, 0)); 

        if (userDetails_.user == address(0) || userDetails_.userToken == address(0)) revert CantBeZero('address');
        if (!storageBeacon.isUser(userDetails_.user)) revert UserNotInDatabase(userDetails_.user);
        if (!storageBeacon.queryTokenDatabase(userDetails_.userToken)) revert TokenNotInDatabase(userDetails_.userToken);
        if (userDetails_.userSlippage <= 0) revert CantBeZero('slippage');
        if (!(address(this).balance > 0)) revert CantBeZero('contract balance');

        (uint fee, ) = IOps(fxConfig.ops).getFeeDetails();
        _transfer(fee, fxConfig.ETH);

        bool isEmergency = false;

        bytes memory swapData = abi.encodeWithSelector(
            FakeOZL(payable(fxConfig.OZL)).exchangeToUserToken.selector, 
            userDetails_
        );

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

        uint amountToSend = address(this).balance;
        (bool success, bytes memory returnData) = fxConfig.inbox.call{value: address(this).balance}(ticketData);
        if (!success) {
            (success, returnData) = fxConfig.inbox.call{value: address(this).balance}(ticketData); 
            if (!success) { 
                _runEmergencyMode();
                isEmergency = true;
                emit EmergencyTriggered(userDetails_.user, amountToSend);
            }
        }

        if (!isEmergency) {
            if (!storageBeacon.getEmitterStatus()) { 
                uint ticketID = abi.decode(returnData, (uint));
                Emitter(fxConfig.emitter).forwardEvent(ticketID); 
            }
            emit FundsToArb(userDetails_.user, amountToSend);
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
        address sBeacon = _getStorageBeacon(_beacon, 0);
        StorageBeacon.EmergencyMode memory eMode = StorageBeacon(sBeacon).getEmergencyMode();
        
        IWETH(eMode.tokenIn).deposit{value: address(this).balance}();
        uint balanceWETH = IWETH(eMode.tokenIn).balanceOf(address(this));

        bool success = IERC20(eMode.tokenIn).ozApprove(
            address(eMode.swapRouter), userDetails.user, balanceWETH, sBeacon
        );

        if (success) {
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

                try eMode.swapRouter.exactInputSingle(params) returns(uint amountOut) { 
                    if (amountOut > 0) {
                        break;
                    } else if (i == 1) {
                        unchecked { ++i; }
                        continue;
                    } else {
                        console.log(12);
                        IERC20(eMode.tokenIn).ozTransfer(userDetails.user, balanceWETH, sBeacon);
                        break;
                    }
                } catch {
                    if (i == 1) {
                        unchecked { ++i; }
                        continue; 
                    } else {
                        uint x = IERC20(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2).balanceOf(address(this));
                        console.log('address(this) in ozPayMe: ', address(this));
                        console.log('weth bal address(this): ', x);
                        console.log('failContract on ozPayMe: ', fxConfig.failedContr);
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


    // function setFailedERCFunds(address user_, IERC20 token_, uint amount_) external {
    //     console.log(31);
    //     StorageBeacon sB = StorageBeacon(_getStorageBeacon(_beacon, 0));

    //     if (sB.userToFailedERC[user_][token_] == 0) sB.userToFailedTokenCount[user_].push(token_);
    //     console.log(41);
    //     sB.userToFailedERC[user_][token_] += amount_;
    //     console.log(51);
    //     console.log('failContract on sBeacon: ', fxConfig.failedContr);
    //     console.log('bal pre ****: ', token_.balanceOf(address(this)));
    //     console.log('address(this): ', address(this));
    //     token_.transfer(fxConfig.failedContr, amount_);
    //     console.log(61);
    //     console.log('bal post ****: ', token_.balanceOf(address(this)));
    // }
    
}







