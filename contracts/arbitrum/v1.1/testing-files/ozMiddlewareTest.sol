// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '../../../libraries/LibCommon.sol';
import '../../../Errors.sol';



contract ozMiddlewareTest is Initializable {

    using LibCommon for bytes;

    address payable private immutable OZL;

    bytes accData;

    event NewToken(address indexed newToken);
    event NewSlippage(uint16 indexed newSlippage);

    constructor(address payable ozDiamond_) {
        OZL = ozDiamond_;
    }

    /*///////////////////////////////////////////////////////////////
                            Modifiers & Init
    //////////////////////////////////////////////////////////////*/


    function initialize(bytes memory accData_) external initializer {
        accData = accData_;
    }
    
    /*///////////////////////////////////////////////////////////////
                            Main functions
    //////////////////////////////////////////////////////////////*/

    function exchangeToAccountToken(
        bytes memory accData_,
        uint amountToSend_,
        address account_
    ) external payable {
        (address user,,) = accData_.extract();
        assert(user != account_);

        if (amountToSend_ <= 0) revert CantBeZero('amountToSend');
        if (!(msg.value > 0)) revert CantBeZero('contract balance');

        (bool success,) = OZL.call{value: msg.value}(msg.data);
        require(success);
    }
}