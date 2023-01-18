// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14; 


import '@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '../../../ethereum/ozUpgradeableBeacon.sol';
import '../../../interfaces/ethereum/IOps.sol';
import './FaultyOzAccountProxy.sol';
import '../../../ethereum/StorageBeacon.sol';
import '../../../Errors.sol';



contract FaultyProxyFactory is ReentrancyGuard, Initializable, UUPSUpgradeable { 

    using Address for address;

    address private immutable beacon;
    address private immutable ops;
    address private constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    modifier onlyOwner() {
        if(!(_getAdmin() == msg.sender)) revert NotAuthorized(msg.sender);
        _;
    }

    constructor(address ops_, address beacon_) {
        ops = ops_;
        beacon = beacon_;
    }


    function createNewProxy(
        StorageBeacon.AccountConfig calldata acc_
    ) external nonReentrant returns(address) {
        bytes calldata name = bytes(acc_.name);
        address token = acc_.token;
        StorageBeacon sBeacon = StorageBeacon(_getStorageBeacon(0));

        if (name.length == 0) revert CantBeZero('name'); 
        if (name.length > 18) revert NameTooLong();
        if (acc_.user == address(0) || token == address(0)) revert CantBeZero('address');
        if (acc_.slippage <= 0) revert CantBeZero('slippage');
        if (!sBeacon.queryTokenDatabase(token)) revert TokenNotInDatabase(token);

        //Replaced with FaultyOzAccountProxy that doesn't forward txs to the implementation
        FaultyOzAccountProxy newAccount = new FaultyOzAccountProxy(
            beacon,
            new bytes(0)
        );

        bytes memory createData = abi.encodeWithSignature(
            'initialize((address,address,uint256,string),address)',
            acc_, beacon
        );
        (bool success, ) = address(newAccount).call(createData);
        require(success);

        bytes32 id = _startTask(address(newAccount), ops);

        sBeacon.multiSave(bytes16(bytes20(address(newAccount))), acc_, id);

        return address(newAccount);
    }

    /*///////////////////////////////////////////////////////////////
                                Helpers
    //////////////////////////////////////////////////////////////*/

    /// @dev Creates the Gelato task of each proxy/account
    function _startTask(address account_, address ops_) private returns(bytes32 id) { 
        id = IOps(ops_).createTaskNoPrepayment( 
            account_,
            bytes4(abi.encodeWithSignature('sendToArb(uint256)')),
            account_,
            abi.encodeWithSignature('checker()'),
            ETH
        );
    }

    /// @dev Gets a version of the Storage Beacon
    function _getStorageBeacon(uint version_) private view returns(address) {
        return ozUpgradeableBeacon(beacon).storageBeacon(version_);
    }

    function initialize() external initializer {
        _changeAdmin(msg.sender);
    }

    /*///////////////////////////////////////////////////////////////
                            Ownership methods
    //////////////////////////////////////////////////////////////*/

    function _authorizeUpgrade(address newImplementation_) internal override onlyOwner {}

    function getOwner() external view onlyProxy returns(address) {
        return _getAdmin();
    }

    function changeOwner(address newOwner_) external onlyProxy onlyOwner {
        _changeAdmin(newOwner_);
    }
}