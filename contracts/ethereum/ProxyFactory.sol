// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14; 


import '@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '../interfaces/ethereum/IProxyFactory.sol';
import '../interfaces/ethereum/IOps.sol';
import './ozUpgradeableBeacon.sol';
import './ozAccountProxy.sol';
import '../Errors.sol';



/**
 * @title Factory of user proxies (aka accounts)
 * @notice Creates the accounts where users will receive their ETH on L1. 
 * Each account is the proxy (ozAccountProxy) connected -through the Beacon- to ozPayMe (the implementation)
 */
contract ProxyFactory is IProxyFactory, ReentrancyGuard, Initializable, UUPSUpgradeable { 

    using Address for address;

    address private beacon;

    modifier onlyOwner() {
        if(!(_getAdmin() == msg.sender)) revert NotAuthorized(msg.sender);
        _;
    }


    /// @inheritdoc IProxyFactory
    function createNewProxy(
        StorageBeacon.AccountConfig calldata acc_
    ) external nonReentrant returns(address) {
        if (bytes(acc_.name).length == 0) revert CantBeZero('name'); 
        if (bytes(acc_.name).length > 18) revert NameTooLong();
        if (acc_.user == address(0) || acc_.token == address(0)) revert CantBeZero('address');
        if (acc_.slippage <= 0) revert CantBeZero('slippage');
        if (!StorageBeacon(_getStorageBeacon(0)).queryTokenDatabase(acc_.token)) revert TokenNotInDatabase(acc_.token);

        ozAccountProxy newAccount = new ozAccountProxy(
            beacon,
            new bytes(0)
        );

        bytes memory createData = abi.encodeWithSignature(
            'initialize((address,address,uint256,string),address)',
            acc_, beacon
        );
        address(newAccount).functionCall(createData);

        _startTask(address(newAccount));

        StorageBeacon(_getStorageBeacon(0)).saveUserToDetails(address(newAccount), acc_); 

        return address(newAccount);
    }

    /*///////////////////////////////////////////////////////////////
                                Helpers
    //////////////////////////////////////////////////////////////*/

    /// @dev Creates the Gelato task of each proxy/account
    function _startTask(address account_) private { 
        StorageBeacon.FixedConfig memory fxConfig = StorageBeacon(_getStorageBeacon(0)).getFixedConfig(); 

        (bytes32 id) = IOps(fxConfig.ops).createTaskNoPrepayment( 
            account_,
            bytes4(abi.encodeWithSignature('sendToArb()')),
            account_,
            abi.encodeWithSignature('checker()'),
            fxConfig.ETH
        );

        StorageBeacon(_getStorageBeacon(0)).saveTaskId(account_, id);
    }

    /// @dev Gets a version of the Storage Beacon
    function _getStorageBeacon(uint version_) private view returns(address) {
        return ozUpgradeableBeacon(beacon).storageBeacon(version_);
    }

    /// @inheritdoc IProxyFactory
    function initialize(address beacon_) external initializer {
        beacon = beacon_;
        _changeAdmin(msg.sender);
    }

    /*///////////////////////////////////////////////////////////////
                            Ownership methods
    //////////////////////////////////////////////////////////////*/

    function _authorizeUpgrade(address newImplementation_) internal override onlyOwner {}

    /// @inheritdoc IProxyFactory
    function getOwner() external view onlyProxy returns(address) {
        return _getAdmin();
    }

    /// @inheritdoc IProxyFactory
    function changeOwner(address newOwner_) external onlyProxy onlyOwner {
        _changeAdmin(newOwner_);
    }
}