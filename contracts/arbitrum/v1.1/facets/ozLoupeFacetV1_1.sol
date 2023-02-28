// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../../../interfaces/arbitrum/ozILoupeFacetV1_1.sol';
import '../../AppStorage.sol';
import '../../../Errors.sol';


/**
 * @dev View methods that query key components, showing the financial statistics
 * of the system and its equilibrum. 
 */
contract ozLoupeFacetV1_1  { //ozILoupeFacetV1_1

    AppStorage s;

    //@inheritdoc ozILoupeFacetV1_1
    function getAccountsByUser(
        address user_
    ) external view returns(address[] memory, string[] memory) {
        AccData storage data = s.userToData[user_];
        address[] memory accounts = data.accounts;
        string[] memory names = new string[](accounts.length);

        for (uint i=0; i < accounts.length; i++) {
            // bytes memory task_name = getTask_Name(user_, accounts[i]);
            bytes32 nameBytes = getTask_Name(user_, accounts[i]);
            // bytes32 nameBytes;

            // assembly {
            //     nameBytes := mload(add(task_name, 64))
            // }
            names[i] = string(bytes.concat(nameBytes));
        }

        return (accounts, names);
    }


    // function getTaskID(address account_, address owner_) external view returns(bytes32) {
    //     AccData storage data = s.userToData[owner_];
    //     if (data.accounts.length == 0) revert UserNotInDatabase(owner_);

    //     bytes memory task_name = getTask_Name(owner_, account_);
    //     bytes32 taskId;
        
    //     assembly {
    //         taskId := mload(add(task_name, 32))
    //     }

    //     if (taskId == bytes32(0)) revert NoTaskId();
    //     return taskId;
    // }

    //@inheritdoc ozILoupeFacetV1_1
    function getTask_Name(address user_, address account_) public view returns(bytes32) {
        bytes32 acc_user = bytes32(bytes.concat(bytes20(account_), bytes12(bytes20(user_))));
        // return s.userToData[user_].acc_userToTask_name[acc_user];

        //--------
        return s.userToData[user_].acc_userToName[acc_user];
    }

    //@inheritdoc ozILoupeFacetV1_1
    function isSelectorAuthorized(bytes4 selector_) external view returns(bool) {
        return s.authorizedSelectors[selector_];
    }
}