// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/proxy/Proxy.sol';
// import '@openzeppelin/contracts/utils/Address.sol';
import '../../libraries/LibCommon.sol';
import '../../Errors.sol';


contract ozAccountL2 is Initializable, Proxy {

    using LibCommon for bytes; 

    bytes accData;

    address private immutable ozMiddleware;
    address private immutable ops;

    event NewToken(address indexed newToken);
    event NewSlippage(uint16 indexed newSlippage);

    constructor(address ozMiddleware_, address ops_) {
        ozMiddleware = ozMiddleware_;
        ops = ops_;
    }

    //----------

    modifier onlyUser() {
        (address user,,) = accData.extract();
        if (msg.sender != user) revert NotAuthorized(msg.sender);
        _;
    }

    modifier checkToken(address newToken_) {
        if (newToken_ == address(0)) revert CantBeZero('address');
        // if (!storageBeacon.queryTokenDatabase(newToken_)) revert TokenNotInDatabase(newToken_); //do this with calling to address(this).queryToken...
        _;
    }

    modifier checkSlippage(uint newSlippage_) {
        if (newSlippage_ < 1 || newSlippage_ > 500) revert CantBeZero('slippage');
        _;
    }

    //--------

    receive() external payable override {}

    function checker() external view returns(bool canExec, bytes memory execPayload) { 
        uint amountToSend = address(this).balance;
        if (amountToSend > 0) canExec = true;

        execPayload = abi.encodeWithSignature(
            'exchangeToAccountToken(bytes,uint256,address)', 
            accData,
            amountToSend,
            address(this)
        );

        // execPayload = abi.encodeWithSignature('exchangeToAccountToken(bytes,uint256,address)', amountToSend); 
    }

    function _implementation() internal view override returns(address) {
        return ozMiddleware;
    }

    function initialize(bytes memory accData_) external initializer {
        accData = accData_;
    }

    //-------

    fallback() external payable override {
        if (msg.sender != ops) revert NotAuthorized(msg.sender);
        (bool success, ) = _implementation().call{value: address(this).balance}(msg.data);
        require(success);
    }

    // function _delegate(address implementation) internal override { 
    //     Address.functionCall{value: address(this).balance}(implementation, msg.data);

    //     // bytes memory data = abi.encodeWithSignature(
    //     //     'exchangeToAccountToken(bytes,uint256,address)', 
    //     //     accData,
    //     //     address(this).balance,
    //     //     address(this)
    //     // );

    //     // assembly {
    //     //     let result := delegatecall(gas(), implementation, add(data, 32), mload(data), 0, 0)
    //     //     returndatacopy(0, 0, returndatasize())
    //     //     switch result
    //     //     case 0 {
    //     //         revert(0, returndatasize())
    //     //     }
    //     //     default {
    //     //         return(0, returndatasize())
    //     //     }
    //     // }
    // }

    //---------
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