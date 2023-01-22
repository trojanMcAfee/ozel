// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14; 


import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';
import '@rari-capital/solmate/src/utils/SafeTransferLib.sol';
import '@rari-capital/solmate/src/utils/FixedPointMathLib.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import '../../interfaces/ethereum/DelayedInbox.sol';
import '../../interfaces/common/IWETH.sol';
import '../../interfaces/ethereum/IOps.sol';
import '../../ethereum/ozUpgradeableBeacon.sol';
import '../../ethereum/StorageBeacon.sol';
import '../../ethereum/FakeOZL.sol';
import '../../ethereum/Emitter.sol';
import '../../libraries/LibCommon.sol';
import '../../Errors.sol';



contract FaultyOzPayMe2 is ReentrancyGuard, Initializable { 

    using FixedPointMathLib for uint;
    using LibCommon for bytes;

    bytes dataForL2;

    address private _beacon;
    
    address private constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address payable private immutable gelato;
    address private immutable OZL;
    address private immutable ops;
    address private immutable inbox;
    address private immutable emitter;

    uint private immutable maxGas;

    event FundsToArb(address indexed sender, uint amount);
    event EmergencyTriggered(address indexed sender, uint amount); 

    constructor(
        address ops_, 
        address payable gelato_, 
        address inbox_,
        address emitter_,
        address ozDiamond_,
        uint maxGas_
    ) {
        ops = ops_;
        gelato = gelato_;
        inbox = inbox_;
        emitter = emitter_;
        OZL = ozDiamond_;
        maxGas = maxGas_;
    }

    /*///////////////////////////////////////////////////////////////
                              Modifiers
    //////////////////////////////////////////////////////////////*/

    /// @dev Checks that only Gelato's PokeMe can make the call
    modifier onlyOps() { 
        if (msg.sender != ops) revert NotAuthorized(msg.sender); 
        _;
    }

    modifier onlyUser() {
        (address user,,) = dataForL2.extract();
        if (msg.sender != user) revert NotAuthorized(msg.sender);
        _;
    }

    /// @dev Checks that the token exists and that's not address(0)
    modifier checkToken(address newToken_) {
        StorageBeacon storageBeacon = StorageBeacon(_getStorageBeacon(_beacon, 0)); 
        if (newToken_ == address(0)) revert CantBeZero('address');
        if (!storageBeacon.queryTokenDatabase(newToken_)) revert TokenNotInDatabase(newToken_);
        _;
    }

    /// @dev Checks that the new slippage is more than 1 basis point
    modifier checkSlippage(uint newSlippage_) {
        if (newSlippage_ < 1) revert CantBeZero('slippage');
        _;
    }


    /*///////////////////////////////////////////////////////////////
                            Main functions
    //////////////////////////////////////////////////////////////*/

    function sendToArb( 
        uint gasPriceBid_,
        uint amountToSend_,
        address account_
    ) external payable onlyOps {   
        (address user,,uint16 slippage) = dataForL2.extract();

        StorageBeacon storageBeacon = StorageBeacon(_getStorageBeacon(_beacon, 0)); 

        if (!storageBeacon.isUser(user)) revert UserNotInDatabase(user);
        if (amountToSend_ <= 0) revert CantBeZero('amountToSend');
        if (!(address(this).balance > 0)) revert CantBeZero('contract balance');

        (uint fee, ) = IOps(ops).getFeeDetails();
        Address.functionCallWithValue(gelato, new bytes(0), fee);

        bool isEmergency = false;

        bytes memory swapData = abi.encodeWithSelector(
            FakeOZL(payable(OZL)).exchangeToAccountToken.selector, 
            dataForL2, amountToSend_, account_
        );
        
        bytes memory ticketData = _createTicketData(gasPriceBid_, swapData, false);
        (bool success, ) = inbox.call{value: address(this).balance}(ticketData); 
        if (!success) {
            /// @dev If it fails the 1st bridge attempt, it decreases the L2 gas calculations
            ticketData = _createTicketData(gasPriceBid_, swapData, true);
            (success, ) = inbox.call{value: address(this).balance}(ticketData);

            if (!success) {
                _runEmergencyMode(user, slippage);
                isEmergency = true;
                emit EmergencyTriggered(user, amountToSend_);
            }
        }

        if (!isEmergency) {
            if (!storageBeacon.getEmitterStatus()) { 
                Emitter(emitter).forwardEvent(user); 
            }
            emit FundsToArb(user, amountToSend_);
        }
    }

    /**
     * @dev Runs the L1 emergency swap in Uniswap. 
     *      If it fails, it doubles the slippage and tries again.
     *      If it fails again, it sends WETH back to the user.
     */
    function _runEmergencyMode(address user_, uint16 slippage_) private nonReentrant { 
        address sBeacon = _getStorageBeacon(_beacon, 0);
        StorageBeacon.EmergencyMode memory eMode = StorageBeacon(sBeacon).getEmergencyMode();
        
        IWETH(eMode.tokenIn).deposit{value: address(this).balance}();
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

    /*///////////////////////////////////////////////////////////////
                               Helpers
    //////////////////////////////////////////////////////////////*/

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

    
    function initialize(
        address beacon_,
        bytes memory dataForL2_
    ) external initializer {
        _beacon = beacon_;
        dataForL2 = dataForL2_;
    }

    /// @dev Gets a version of the Storage Beacon from a Beacon implementation
    function _getStorageBeacon(address beacon_, uint version_) private view returns(address) { 
        return ozUpgradeableBeacon(beacon_).storageBeacon(version_);
    }

    /*///////////////////////////////////////////////////////////////
                          Account methods
    //////////////////////////////////////////////////////////////*/

    
    function changeAccountToken(
        address newToken_
    ) external checkToken(newToken_) onlyUser { 
        (address user,,uint16 slippage) = dataForL2.extract();
        dataForL2 = bytes.concat(bytes20(user), bytes20(newToken_), bytes2(slippage));
    }

    
    function changeAccountSlippage(
        uint16 newSlippage_
    ) external checkSlippage(newSlippage_) onlyUser { 
        (address user, address token,) = dataForL2.extract();
        dataForL2 = bytes.concat(bytes20(user), bytes20(token), bytes2(newSlippage_));
    }

    
    function changeAccountTokenNSlippage( 
        address newToken_, 
        uint16 newSlippage_
    ) external checkToken(newToken_) checkSlippage(newSlippage_) onlyUser {
        (address user,,) = dataForL2.extract();
        dataForL2 = bytes.concat(bytes20(user), bytes20(newToken_), bytes2(newSlippage_));
    } 


    function getAccountDetails() external view returns(
        address user, 
        address token, 
        uint16 slippage
    ) {
        (user, token, slippage) = dataForL2.extract();
    }

    function withdrawETH_lastResort() external onlyUser { 
        (bool success, ) = payable(msg.sender).call{value: address(this).balance}('');
        if (!success) revert CallFailed('ozPayMe: withdrawETH_lastResort failed');
    }

    /*///////////////////////////////////////////////////////////////
                        Retryable helper methods
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @dev Calculates the L1 gas values for the retryableticket's auto redeemption
     */
    function _calculateGasDetails(
        bytes memory swapData_, 
        uint gasPriceBid_, 
        bool decrease_
    ) private view returns(uint maxSubmissionCost, uint autoRedeem) {
        maxSubmissionCost = DelayedInbox(inbox).calculateRetryableSubmissionFee(
            swapData_.length,
            0
        );

        maxSubmissionCost = decrease_ ? maxSubmissionCost : maxSubmissionCost * 2;
        autoRedeem = maxSubmissionCost + (gasPriceBid_ * maxGas);

        /**
            Added address(this).balance to autoRedeem to activate the if path of below
         */
        autoRedeem += address(this).balance;

        if (autoRedeem > address(this).balance) autoRedeem = address(this).balance;
    }

    /**
     * @dev Creates the ticket's calldata based on L1 gas values
     */
    function _createTicketData( 
        uint gasPriceBid_, 
        bytes memory swapData_,
        bool decrease_
    ) private view returns(bytes memory) {
        (uint maxSubmissionCost, uint autoRedeem) = _calculateGasDetails(swapData_, gasPriceBid_, decrease_);

        return abi.encodeWithSelector(
            DelayedInbox(inbox).createRetryableTicket.selector, 
            OZL, 
            address(this).balance - autoRedeem,
            maxSubmissionCost, 
            OZL, 
            OZL, 
            maxGas,  
            gasPriceBid_, 
            swapData_
        );
    }
}

