// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14; 


error CantBeZero(string nonZeroValue);
error CallFailed(string errorMsg); 
error TokenNotInDatabase(address token);
error TokenAlreadyInDatabase(address token);
error UserNotInDatabase(address user);
error NotAccount();
error ConditionNotMet(string errorMsg);
error NotAuthorized(address unauthorizedUser_);
error NoReentrance();
error NotEnabled();
error LowSlippage(uint slippage);
error NameTooLong();
error InvalidTask(bytes32 taskId);