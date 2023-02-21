// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../AppStorage.sol';


contract ozLoupeFacetV1_1 {

    AppStorage s;

    function getAccountsByUser(
        address user_
    ) external view returns(address[] memory, string[] memory) {
        AccData storage data = s.userToData[user_];
        address[] memory accounts = data.accounts;
        string[] memory names = new string[](accounts.length);

        for (uint i=0; i < accounts.length; i++) {
            // bytes memory task_name = 
            //     _getTask_Name(accounts[i], user_, data.acc_userToTask_name);

            bytes32 acc_user = bytes32(bytes.concat(bytes20(accounts[i]), bytes12(bytes20(user_))));
            bytes memory task_name = getTask_Name(user_, acc_user);
            bytes32 nameBytes;

            assembly {
                nameBytes := mload(add(task_name, 64))
            }
            names[i] = string(bytes.concat(nameBytes));
        }

        return (accounts, names);
    }


    function _getTask_Name(
        address account_, 
        address owner_,
        mapping(bytes32 => bytes) storage acc_userToTask_name_
    ) private view returns(bytes memory) {
        bytes32 acc_user = bytes32(bytes.concat(bytes20(account_), bytes12(bytes20(owner_))));
        bytes memory task_name = acc_userToTask_name_[acc_user];
        return task_name;
    }

    function getTask_Name(address user_, bytes32 acc_user_) public view returns(bytes memory) {
        return s.userToData[user_].acc_userToTask_name[acc_user_];
    }



    
}