// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14; 


error CantBeZero(string nonZeroValue);
error CallFailed(string errorMsg);
error TokenNotInDatabase(address token);
error NotProxy();
error ConditionNotMet(string errorMsg);
error NotAuthorized(address unauthorizedUser_);
error NoReentrance();