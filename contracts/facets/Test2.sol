// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


contract Test2 {

    address public user;
    address public userToken;

    event UserDetails(address user, address userToken);


    function exchangeToUserToken(address _user, address _userToken) external {
        user = _user;
        userToken = _userToken;
        emit UserDetails(_user, _userToken);
    } 


}