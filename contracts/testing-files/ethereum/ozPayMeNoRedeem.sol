// // SPDX-License-Identifier: GPL-2.0-or-later
// pragma solidity 0.8.14; 


// import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';
// import '@rari-capital/solmate/src/utils/SafeTransferLib.sol';
// import '@rari-capital/solmate/src/utils/FixedPointMathLib.sol';
// import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
// import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
// import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
// import '../../interfaces/ethereum/DelayedInbox.sol';
// import '../../interfaces/common/IWETH.sol';
// import '../../interfaces/ethereum/IOps.sol';
// import '../../ethereum/ozUpgradeableBeacon.sol';
// import '../../ethereum/StorageBeacon.sol';
// import '../../ethereum/FakeOZL.sol';
// import '../../ethereum/Emitter.sol';
// import '../../Errors.sol';



// contract ozPayMeNoRedeem is ReentrancyGuard, Initializable { 

//     using FixedPointMathLib for uint;

//     StorageBeacon.AccountConfig accountDetails;
//     StorageBeacon.FixedConfig fxConfig;

//     address private _beacon;

//     event FundsToArb(address indexed sender, uint amount);
//     event EmergencyTriggered(address indexed sender, uint amount);
//     event NewToken(address indexed user, address indexed newToken);
//     event NewSlippage(address indexed user, uint indexed newSlippage);


//     modifier onlyOps() {
//         if (msg.sender != fxConfig.ops) revert NotAuthorized(msg.sender);
//         _;
//     }

//     modifier onlyUser() {
//         if (msg.sender != accountDetails.user) revert NotAuthorized(msg.sender);
//         _;
//     }


//     function sendToArb( 
//         uint gasPriceBid_,
//         StorageBeacon.AccountConfig calldata acc_,
//         uint amountToSend_
//     ) external payable onlyOps {   
//         if (amountToSend_ <= 0) revert CantBeZero('amountToSend');
         
//         StorageBeacon storageBeacon = StorageBeacon(_getStorageBeacon(_beacon, 0)); 

//         if (acc_.user == address(0) || acc_.token == address(0)) revert CantBeZero('address');
//         if (!storageBeacon.isUser(acc_.user)) revert UserNotInDatabase(acc_.user);
//         if (!storageBeacon.queryTokenDatabase(acc_.token)) revert TokenNotInDatabase(acc_.token);
//         if (acc_.slippage <= 0) revert CantBeZero('slippage');
//         if (!(address(this).balance > 0)) revert CantBeZero('contract balance');

//         (uint fee, ) = IOps(fxConfig.ops).getFeeDetails();
//         _transfer(fee, fxConfig.ETH);

//         bool isEmergency = false;

//         bytes memory swapData = abi.encodeWithSelector(
//             FakeOZL(payable(fxConfig.OZL)).exchangeToAccountToken.selector, 
//             acc_
//         );

//         bytes memory ticketData = _createTicketData(gasPriceBid_, swapData, false);

//         (bool success, ) = fxConfig.inbox.call{value: address(this).balance}(ticketData); 
        
//         if (!success) {
//             ticketData = _createTicketData(gasPriceBid_, swapData, true);
//             (success, ) = fxConfig.inbox.call{value: address(this).balance}(ticketData);

//             if (!success) {
//                 _runEmergencyMode();
//                 isEmergency = true;
//                 emit EmergencyTriggered(acc_.user, amountToSend_);
//             }
//         }

//         if (!isEmergency) {
//             if (!storageBeacon.getEmitterStatus()) { 
//                 Emitter(fxConfig.emitter).forwardEvent(acc_.user); 
//             }
//             emit FundsToArb(acc_.user, amountToSend_);
//         }
//     }


//     function _runEmergencyMode() private nonReentrant { 
//         address sBeacon = _getStorageBeacon(_beacon, 0);
//         StorageBeacon.EmergencyMode memory eMode = StorageBeacon(sBeacon).getEmergencyMode();
        
//         IWETH(eMode.tokenIn).deposit{value: address(this).balance}();
//         uint balanceWETH = IWETH(eMode.tokenIn).balanceOf(address(this));

//         IERC20(eMode.tokenIn).approve(address(eMode.swapRouter), balanceWETH);

//         for (uint i=1; i <= 2;) {
//             ISwapRouter.ExactInputSingleParams memory params =
//                 ISwapRouter.ExactInputSingleParams({
//                     tokenIn: eMode.tokenIn,
//                     tokenOut: eMode.tokenOut, 
//                     fee: eMode.poolFee,
//                     recipient: accountDetails.user,
//                     deadline: block.timestamp,
//                     amountIn: balanceWETH,
//                     amountOutMinimum: _calculateMinOut(eMode, i, balanceWETH), 
//                     sqrtPriceLimitX96: 0
//                 });

//             try eMode.swapRouter.exactInputSingle(params) { 
//                 break; 
//             } catch {
//                 if (i == 1) {
//                     unchecked { ++i; }
//                     continue; 
//                 } else {
//                     IERC20(eMode.tokenIn).transfer(accountDetails.user, balanceWETH);
//                     break;
//                 }
//             }
//         } 
//     }

//     /**
//         CONTRACT HELPERS
//      */

//     function _transfer(uint256 _amount, address _paymentToken) private {
//         if (_paymentToken == fxConfig.ETH) {
//             (bool success, ) = fxConfig.gelato.call{value: _amount}("");
//             if (!success) revert CallFailed("_transfer: ETH transfer failed");
//         } else {
//             SafeTransferLib.safeTransfer(ERC20(_paymentToken), fxConfig.gelato, _amount); 
//         }
//     }

//     function _calculateMinOut(
//         StorageBeacon.EmergencyMode memory eMode_, 
//         uint i_,
//         uint balanceWETH_
//     ) private view returns(uint minOut) {
//         (,int price,,,) = eMode_.priceFeed.latestRoundData();
//         uint expectedOut = balanceWETH_.mulDivDown(uint(price) * 10 ** 10, 1 ether);
//         uint minOutUnprocessed = 
//             expectedOut - expectedOut.mulDivDown(accountDetails.slippage * i_ * 100, 1000000); 
//         minOut = minOutUnprocessed.mulWadDown(10 ** 6);
//     }

//     function initialize(
//         StorageBeacon.AccountConfig calldata acc_, 
//         address beacon_
//     ) external initializer {
//         accountDetails = acc_;  
//         fxConfig = StorageBeacon(_getStorageBeacon(beacon_, 0)).getFixedConfig();
//         _beacon = beacon_;
//     }


//     function _getStorageBeacon(address beacon_, uint version_) private view returns(address) { 
//         return ozUpgradeableBeacon(beacon_).storageBeacon(version_);
//     }


//     /**
//         ACCOUNT DETAILS METHODS
//      */

//     function changeAccountToken(address newToken_) external onlyUser {
//         StorageBeacon storageBeacon = StorageBeacon(_getStorageBeacon(_beacon, 0)); 

//         if (newToken_ == address(0)) revert CantBeZero('address');
//         if (!storageBeacon.queryTokenDatabase(newToken_)) revert TokenNotInDatabase(newToken_);

//         accountDetails.token = newToken_;
//         emit NewToken(msg.sender, newToken_);
//     }


//     function changeAccountSlippage(uint newSlippage_) external onlyUser {
//         if (newSlippage_ <= 0) revert CantBeZero('slippage');
//         accountDetails.slippage = newSlippage_;
//         emit NewSlippage(msg.sender, newSlippage_);
//     } 

//     function getAccountDetails() external view returns(StorageBeacon.AccountConfig memory) {
//         return accountDetails;
//     }


//     /**
//         ARB'S HELPERS
//      */

//      function _decreaseCost(uint maxSubmissionCost_) private pure returns(uint) {
//         return maxSubmissionCost_ - (uint(30 * 1 ether)).mulDivDown(maxSubmissionCost_, 100 * 1 ether);
//     }

    
//     function _calculateGasDetails(bytes memory swapData_, uint gasPriceBid_) private view returns(uint, uint) {
//         uint maxSubmissionCost = DelayedInbox(fxConfig.inbox).calculateRetryableSubmissionFee(
//             swapData_.length,
//             0
//         );
//         maxSubmissionCost *= 3;
//         uint autoRedeem = maxSubmissionCost + (gasPriceBid_ * fxConfig.maxGas);
//         return (maxSubmissionCost, autoRedeem);
//     }

//     //autoRedeem set to 0 has been removed so it failes the retryable
//     function _createTicketData( 
//         uint gasPriceBid_, 
//         bytes memory swapData_,
//         bool decrease_
//     ) private view returns(bytes memory) {
//         (uint maxSubmissionCost, uint autoRedeem) = _calculateGasDetails(swapData_, gasPriceBid_);
//         maxSubmissionCost = decrease_ ? _decreaseCost(maxSubmissionCost) : maxSubmissionCost;

//         autoRedeem = 0;

//         return abi.encodeWithSelector(
//             DelayedInbox(fxConfig.inbox).createRetryableTicket.selector, 
//             fxConfig.OZL, 
//             address(this).balance - autoRedeem, 
//             maxSubmissionCost, 
//             fxConfig.OZL, 
//             fxConfig.OZL, 
//             fxConfig.maxGas,  
//             gasPriceBid_, 
//             swapData_
//         );
//     }
// }










