// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../../libraries/LibCommon.sol';
import '../../Errors.sol';
// import '../ozDiamond.sol';
import './ozLoupeFacetV1_1.sol';
import { AccData } from '../AppStorage.sol';

import 'hardhat/console.sol';

contract ozMiddlewareL2 {

    address payable private immutable OZL;

    constructor(address payable ozDiamond_) {
        OZL = ozDiamond_;
    }


    function exchangeToAccountToken(
        bytes memory accData_,
        uint amountToSend_,
        address account_
    ) external payable {
        (address user,,) = LibCommon.extract(accData_);

        bytes32 acc_user = bytes32(bytes.concat(bytes20(msg.sender), bytes12(bytes20(user))));
        if (!_verify(user, acc_user)) revert NotAccount();

        (address[] memory accounts,) = ozLoupeFacetV1_1(OZL).getAccountsByUser(user);
        if (accounts.length == 0) revert UserNotInDatabase(user);

        if (amountToSend_ <= 0) revert CantBeZero('amountToSend');
        if (!(msg.value > 0)) revert CantBeZero('contract balance');

        (bool success,) = OZL.call{value: msg.value}(msg.data);
        require(success);

    }


    function _verify(address user_, bytes32 acc_user_) private returns(bool) {
        bytes memory task_name = ozLoupeFacetV1_1(OZL).getTask_Name(user_, acc_user_);
        return bytes32(task_name) != bytes32(0);
    }




}