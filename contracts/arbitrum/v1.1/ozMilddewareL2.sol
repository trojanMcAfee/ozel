// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '../../libraries/LibCommon.sol';
import '../../Errors.sol';
// import '../ozDiamond.sol';
import './ozLoupeFacetV1_1.sol';
import { AccData } from '../AppStorage.sol';
import '../facets/ozLoupeFacet.sol';

import 'hardhat/console.sol';

contract ozMiddlewareL2 {

    using LibCommon for bytes;

    address payable private immutable OZL;

    bytes accData;

    event NewToken(address indexed newToken);
    event NewSlippage(uint16 indexed newSlippage);

    constructor(address payable ozDiamond_) {
        OZL = ozDiamond_;
    }

    //--------
    modifier onlyUser() {
        (address user,,) = accData.extract();
        if (msg.sender != user) revert NotAuthorized(msg.sender);
        _;
    }

    modifier checkToken(address newToken_) {
        if (newToken_ == address(0)) revert CantBeZero('address');
        if (!ozLoupeFacet(OZL).queryTokenDatabase(newToken_)) revert TokenNotInDatabase(newToken_);
        _;
    }

    modifier checkSlippage(uint newSlippage_) {
        if (newSlippage_ < 1 || newSlippage_ > 500) revert CantBeZero('slippage');
        _;
    }
    //----------

    function exchangeToAccountToken(
        bytes memory accData_,
        uint amountToSend_,
        address account_
    ) external payable {
        assert(account_ == msg.sender);
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


    function _verify(address user_, bytes32 acc_user_) private view returns(bool) {
        bytes memory task_name = ozLoupeFacetV1_1(OZL).getTask_Name(user_, acc_user_);
        return bytes32(task_name) != bytes32(0);
    }


    //-------

    function changeToken(
        address newToken_
    ) external checkToken(newToken_) onlyUser { 
        (address user,,uint16 slippage) = accData.extract();
        accData = bytes.concat(bytes20(user), bytes20(newToken_), bytes2(slippage));
        emit NewToken(newToken_);
    }

    function changeSlippage(
        uint16 newSlippage_
    ) external checkSlippage(newSlippage_) onlyUser { 
        (address user, address token,) = accData.extract();
        accData = bytes.concat(bytes20(user), bytes20(token), bytes2(newSlippage_));
        emit NewSlippage(newSlippage_);
    }

    function changeTokenNSlippage( 
        address newToken_, 
        uint16 newSlippage_
    ) external checkToken(newToken_) checkSlippage(newSlippage_) onlyUser {
        (address user,,) = accData.extract();
        accData = bytes.concat(bytes20(user), bytes20(newToken_), bytes2(newSlippage_));
        emit NewToken(newToken_);
        emit NewSlippage(newSlippage_);
    } 

    function getDetails() external view returns(
        address user, 
        address token, 
        uint16 slippage
    ) {
        (user, token, slippage) = accData.extract();
    }

    function withdrawETH_lastResort() external onlyUser { 
        (bool success, ) = payable(msg.sender).call{value: address(this).balance}('');
        if (!success) revert CallFailed('ozPayMe: withdrawETH_lastResort failed');
    }

}