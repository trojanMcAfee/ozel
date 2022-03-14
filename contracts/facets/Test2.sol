// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


contract Test2 {

    address public user;
    address public userToken;
    string public phrase; 
    uint public num; 
    uint public num2;
    uint public balance1;
    uint public balance2;


    receive() external payable { 
        num2 = address(this).balance; 
        // _exchangeToUserToken2();
    }

    // receive() external payable {}



    function exchangeToUserToken(address _user, address _userToken) external payable {
        // address x = 0xE8d9B359F9da35e8a19E612807376152ff445DF2;
        // (bool success, ) = x.call{value: msg.value}(""); //address(this).balance
        // require(success, 'ETH sent failed');

        // if (msg.value > 0) {
        //     num2 = msg.value;
        // } 
        
        // if (address(this).balance > 0) {
        //     balance1 = address(this).balance;
        // } else {
        //     balance1 = 33 * 1 ether;
        // }

        user = _user;
        userToken = _userToken;
        num = 24;
    } 

    // function _exchangeToUserToken2() private {
    //     address x = 0xf57249ac97d685110071bd561d3c274ee84C3A15;
    //     (bool success, ) = x.call{value: address(this).balance}("");
    //     require(success, 'ETH sent failed');
    // }

    function setName(string memory _str) external {
        phrase = _str;
    }


}