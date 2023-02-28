// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@openzeppelin/contracts/utils/Address.sol";
import { AccountConfig, AccData } from '../../AppStorage.sol';
import { ModifiersARB } from '../../Modifiers.sol';
import '../../../libraries/LibDiamond.sol';
import './ozAccountTest.sol';
import '../../../Errors.sol';


contract ozProxyFactoryTest is ModifiersARB {

    using Address for address;

    address private immutable beacon;

    event AccountCreated(address indexed account);

    constructor(address beacon_) {
        beacon = beacon_;
    }

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

        ozAccountTest newAccount = new ozAccountTest(beacon, address(this));

        bytes2 slippage = bytes2(uint16(acc_.slippage));
        bytes memory accData = bytes.concat(bytes20(acc_.user), bytes20(acc_.token), slippage);
    
        bytes memory createData = abi.encodeWithSignature(
            'initialize(bytes)',
            accData
        );
        address(newAccount).functionCall(createData);

        _multiSave(bytes20(address(newAccount)), acc_);

        emit AccountCreated(address(newAccount));
    }

    function authorizeSelector(bytes4 selector_, bool status_) external {
        LibDiamond.enforceIsContractOwner();
        s.authorizedSelectors[selector_] = status_;
    }

    function _multiSave(
        bytes20 account_,
        AccountConfig calldata acc_
    ) private { 
        address user = acc_.user;
        bytes32 acc_user = bytes32(bytes.concat(account_, bytes12(bytes20(user))));
        bytes32 nameBytes = bytes32(bytes(acc_.name));

        if (s.userToData[user].accounts.length == 0) {
            AccData storage data = s.userToData[user];
            data.accounts.push(address(account_));
            data.acc_userToName[acc_user] = nameBytes;
        } else {
            s.userToData[user].accounts.push(address(account_));
            s.userToData[user].acc_userToName[acc_user] = nameBytes;
        }
    }
}