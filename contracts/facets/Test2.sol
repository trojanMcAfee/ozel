// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


contract Test2 {

    address public user;
    address public userToken;
    string public phrase;

    event UserDetails(address user, address userToken);

    receive() external payable {}


    function exchangeToUserToken(address _user, address _userToken) external payable {
        address x = 0xf57249ac97d685110071bd561d3c274ee84C3A15;
        (bool success, ) = x.call{value: address(this).balance}("");
        require(success, 'ETH sent failed');
        userToken = _userToken;
        emit UserDetails(_user, _userToken);
    } 

    function setName(string memory _str) external {
        phrase = _str;
    }


}