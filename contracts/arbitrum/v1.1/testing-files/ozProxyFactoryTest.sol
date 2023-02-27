// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@openzeppelin/contracts/utils/Address.sol";
import { AccountConfig } from '../../AppStorage.sol';
import '../../../interfaces/ethereum/IOps.sol';
import './ozAccountTest.sol';
import '../../../Errors.sol';


/**
 * @title Factory of user proxies (aka accounts)
 * @notice Creates the accounts where users will receive their ETH on L2. 
 * Each account is the proxy (ozAccountProxyL2) connected -through the Beacon- to ozMiddleware (the implementation)
 */
contract ozProxyFactoryTest {

    using Address for address;

    address private immutable ops;
    address private immutable beacon;
    address private constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address private constant OZL = 0xAa5f138691768EDEaD231915eF7AB9370A708d70;

    mapping(address => bytes32) accToTask;

    event AccountCreated(address indexed account);

    constructor(address ops_, address beacon_) {
        ops = ops_;
        beacon = beacon_;
    }

    //@inheritdoc ozIProxyFactoryFacet
    function createNewProxy(
        AccountConfig calldata acc_
    ) external {
        bytes calldata name = bytes(acc_.name);
        address token = acc_.token;

        if (name.length == 0) revert CantBeZero('name'); 
        if (name.length > 18) revert NameTooLong();
        if (acc_.user == address(0) || token == address(0)) revert CantBeZero('address');
        if (acc_.slippage < 1 || acc_.slippage > 500) revert CantBeZero('slippage');

        ozAccountTest newAccount = new ozAccountTest(beacon, ops, OZL);

        bytes2 slippage = bytes2(uint16(acc_.slippage));
        bytes memory accData = bytes.concat(bytes20(acc_.user), bytes20(acc_.token), slippage);
    
        bytes memory createData = abi.encodeWithSignature(
            'initialize(bytes)',
            accData
        );
        address(newAccount).functionCall(createData);

        bytes32 id = _startTask(address(newAccount));
        
        accToTask[address(newAccount)] = id;

        emit AccountCreated(address(newAccount));
    }

    /*///////////////////////////////////////////////////////////////
                                Helpers
    //////////////////////////////////////////////////////////////*/

    /// @dev Creates the Gelato task of each proxy/account
    function _startTask(address account_) private returns(bytes32 id) {         
        id = IOps(ops).createTaskNoPrepayment( 
            account_, 
            bytes4(abi.encodeWithSignature('exchangeToAccountToken(bytes,uint256,address)')),
            account_,
            abi.encodeWithSignature('checker()'),
            ETH
        );
    }

    /// @dev Returns the Gelato Task Id of an Account
    function getTaskID(address account_) external view returns(bytes32) {
        return accToTask[account_];
    }
}