// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../libraries/LibCommon.sol';
import '../Errors.sol';
import '../ozDiamond.sol';
import { AccData } from '../AppStorage.sol';

contract ozMiddlewareL2 {

    address private immutable OZL;

    constructor(address ozDiamond_) {
        OZL = ozDiamond_;
    }



    function forwardCall(
        bytes memory accData_,
        uint amountToSend_,
    ) external payable {
        (address user,,) = LibCommon.extract(accData_);

        bytes32 acc_user = bytes32(bytes.concat(bytes20(msg.sender), bytes12(bytes20(user))));
        if (_verify(user, acc_user)) revert NotAccount();

        (bool success,) = OZL.call{value: msg.value}(msg.data);
        require(success);

        //put here other checks and test run
    }


    function _verify(address user_, bytes32 acc_user_) private view returns(bool) {
        AccData storage data = ozDiamond(OZL).getBytesAccData(user_);
        bytes memory task_name = data.acc_userToTask_name[acc_user_];
        return bytes32(task_name) != bytes32(0);
    }




}