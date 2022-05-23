//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@rari-capital/solmate/src/auth/authorities/RolesAuthority.sol';


contract ozAuthority {

    RolesAuthority auth;
    


    function canCall(
        address user_,
        address target_,
        bytes4 functionSig_
    ) external view returns(bool) {
        bool isAuth = auth.canCall(user_, target_, functionSig_);
        return isAuth;
    }


}