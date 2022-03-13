// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


contract Test2 {

    address public user;
    address public userToken;
    string public phrase; 
    uint public num; 

    event UserDetails(address user, address userToken);

    // receive() external payable { //try to manually redeem the tx with the ticketID and precompile
    //     num = 23; 
    //     // _exchangeToUserToken2();   //try to depositETH and then sendL2Message with user and userToken
    // }

    receive() external payable {}


    function exchangeToUserToken(address _user, address _userToken) external payable {
        // address x = 0xf57249ac97d685110071bd561d3c274ee84C3A15;
        // (bool success, ) = x.call{value: msg.value}(""); //address(this).balance
        // require(success, 'ETH sent failed');
        // userToken = _userToken;
        // user = _user;
        // emit UserDetails(_user, _userToken);

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