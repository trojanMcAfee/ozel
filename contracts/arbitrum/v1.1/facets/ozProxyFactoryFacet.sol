// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@openzeppelin/contracts/utils/Address.sol";
import { AccountConfig, AccData } from '../../AppStorage.sol';
import { ModifiersARB } from '../../Modifiers.sol';
import '../../../interfaces/arbitrum/ozIProxyFactoryFacet.sol';
import '../../../interfaces/ethereum/IOps.sol';
import '../../../libraries/LibDiamond.sol';
import './ozAccountProxyL2.sol';
import '../../../Errors.sol';


/**
 * @title Factory of user proxies (aka accounts)
 * @notice Creates the accounts where users will receive their ETH on L2. 
 * Each account is the proxy (ozAccountProxyL2) connected -through the Beacon- to ozMiddleware (the implementation)
 */
contract ozProxyFactoryFacet is ozIProxyFactoryFacet, ModifiersARB {

    using Address for address;

    address private immutable ops;
    address private immutable beacon;

    event AccountCreated(address indexed account);

    constructor(address ops_, address beacon_) {
        ops = ops_;
        beacon = beacon_;
    }

    //@inheritdoc ozIProxyFactoryFacet
    function createNewProxy(
        AccountConfig calldata acc_
    ) external noReentrancy(0) {
        bytes calldata name = bytes(acc_.name);
        address token = acc_.token;

        if (name.length == 0) revert CantBeZero('name'); 
        if (name.length > 18) revert NameTooLong();
        if (acc_.user == address(0) || token == address(0)) revert CantBeZero('address');
        if (acc_.slippage < 1 || acc_.slippage > 500) revert CantBeZero('slippage');
        if (!s.tokenDatabase[token]) revert TokenNotInDatabase(token);

        ozAccountProxyL2 newAccount = new ozAccountProxyL2(beacon, ops, address(this));

        bytes2 slippage = bytes2(uint16(acc_.slippage));
        bytes memory accData = bytes.concat(bytes20(acc_.user), bytes20(acc_.token), slippage);
    
        bytes memory createData = abi.encodeWithSignature(
            'initialize(bytes)',
            accData
        );
        address(newAccount).functionCall(createData);

        bytes32 id = _startTask(address(newAccount));

        _multiSave(bytes20(address(newAccount)), acc_, id);

        emit AccountCreated(address(newAccount));
    }

    //@inheritdoc ozIProxyFactoryFacet
    function authorizeSelector(bytes4 selector_, bool status_) external {
        LibDiamond.enforceIsContractOwner();
        s.authorizedSelectors[selector_] = status_;
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
            s.ETH
        );
    }

    /**
     * @dev Saves and connects the address of the account to its details.
     * @param account_ The account/proxy
     * @param acc_ Details of the account/proxy
     * @param taskId_ Gelato's task id
     */
    function _multiSave(
        bytes20 account_,
        AccountConfig calldata acc_,
        bytes32 taskId_
    ) private { 
        address user = acc_.user;
        bytes32 acc_user = bytes32(bytes.concat(account_, bytes12(bytes20(user))));
        bytes memory task_name = bytes.concat(taskId_, bytes32(bytes(acc_.name)));

        if (s.userToData[user].accounts.length == 0) {
            AccData storage data = s.userToData[user];
            data.accounts.push(address(account_));
            data.acc_userToTask_name[acc_user] = task_name;
        } else {
            s.userToData[user].accounts.push(address(account_));
            s.userToData[user].acc_userToTask_name[acc_user] = task_name;
        }
    }
}