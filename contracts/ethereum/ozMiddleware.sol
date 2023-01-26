// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import './ozPayMe.sol';
import './StorageBeacon.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../Errors.sol';
import './StorageBeacon.sol';
import '../interfaces/common/IWETH.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';


contract ozMiddleware is Ownable, ReentrancyGuard {

    using FixedPointMathLib for uint;

    address private immutable inbox;
    address private beacon;
    address private payme;

    constructor(address inbox_) {
        inbox = inbox_;
    }

    modifier onlyAccount(address user_) {
        bytes32 acc_user = bytes32(bytes.concat(bytes20(msg.sender), bytes12(bytes20(user_))));
        if (!StorageBeacon(_getStorageBeacon(0)).verify(user_, acc_user)) revert NotAccount();
        _;
    }


    function forwardCall(
        bytes memory ticketData_,
        uint gasPriceBid_,
        bytes memory swapData_,
        address user_,
        uint16 slippage_
    ) external payable onlyAccount(user_) returns(bool isEmergency) {

        (bool success, ) = inbox.call{value: msg.value}(ticketData_); 
        if (!success) {
            /// @dev If it fails the 1st bridge attempt, it decreases the L2 gas calculations
            bytes memory ticketData = ozPayMe(payme).createTicketData(gasPriceBid_, swapData_, true);
            (success, ) = inbox.call{value: msg.value}(ticketData);

            if (!success) {
                _runEmergencyMode(user_, slippage_);
                isEmergency = true;
            }
        }
    }


    /**
     * @dev Runs the L1 emergency swap in Uniswap. 
     *      If it fails, it doubles the slippage and tries again.
     *      If it fails again, it sends WETH back to the user.
     */
    function _runEmergencyMode(address user_, uint16 slippage_) private nonReentrant { 
        address sBeacon = _getStorageBeacon(0);
        StorageBeacon.EmergencyMode memory eMode = StorageBeacon(sBeacon).getEmergencyMode();
        
        IWETH(eMode.tokenIn).deposit{value: msg.value}();
        uint balanceWETH = IWETH(eMode.tokenIn).balanceOf(address(this));

        IERC20(eMode.tokenIn).approve(address(eMode.swapRouter), balanceWETH);

        for (uint i=1; i <= 2;) {
            ISwapRouter.ExactInputSingleParams memory params =
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: eMode.tokenIn,
                    tokenOut: eMode.tokenOut, 
                    fee: eMode.poolFee,
                    recipient: user_,
                    deadline: block.timestamp,
                    amountIn: balanceWETH,
                    amountOutMinimum: _calculateMinOut(eMode, i, balanceWETH, slippage_), 
                    sqrtPriceLimitX96: 0
                });

            try eMode.swapRouter.exactInputSingle(params) { 
                break; 
            } catch {
                if (i == 1) {
                    unchecked { ++i; }
                    continue; 
                } else {
                    IERC20(eMode.tokenIn).transfer(user_, balanceWETH);
                    break;
                }
            }
        } 
    }

    /**
     * @dev Using the account slippage, calculates the minimum amount of tokens out.
     *      Uses the "i" variable from the parent loop to double the slippage, if necessary.
     */
    function _calculateMinOut(
        StorageBeacon.EmergencyMode memory eMode_, 
        uint i_,
        uint balanceWETH_,
        uint slippage_
    ) private view returns(uint minOut) {
        (,int price,,,) = eMode_.priceFeed.latestRoundData();
        uint expectedOut = balanceWETH_.mulDivDown(uint(price) * 10 ** 10, 1 ether);
        uint minOutUnprocessed = 
            expectedOut - expectedOut.mulDivDown(slippage_ * i_ * 100, 1000000); 
        minOut = minOutUnprocessed.mulWadDown(10 ** 6);
    }


    /// @dev Gets a version of the Storage Beacon
    function _getStorageBeacon(uint version_) private view returns(address) {
        return ozUpgradeableBeacon(beacon).storageBeacon(version_);
    }

    function setInit(address payme_, address beacon_) external onlyOwner {
        payme = payme_;
        beacon = beacon_;
    }


}