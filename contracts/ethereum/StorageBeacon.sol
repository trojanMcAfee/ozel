// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../interfaces/ethereum/IStorageBeacon.sol';
import '../libraries/LibCommon.sol';
import './ozUpgradeableBeacon.sol';
import '../Errors.sol';

import '@rari-capital/solmate/src/utils/SSTORE2.sol';
import 'hardhat/console.sol';
/**
 * @title Main storage contract for the L1 side of the system.
 * @notice It acts as a separate centralized beacon that functions query for state
 * variables. It can be upgraded into different versions while keeping the older ones.
 */
contract StorageBeacon is IStorageBeacon, Initializable, Ownable {

    FixedConfig fxConfig;
    EmergencyMode eMode;

    mapping(address => bytes32) taskIDs;
    mapping(address => bool) tokenDatabase;
    mapping(address => bool) userDatabase;


    mapping(address => address[]) userToAccounts;

    // struct AccountConfig {
    //     address user;
    //     address token;
    //     uint slippage; 
    //     string name;
    // }

    //-----
    struct Details {
        mapping(address => AccountConfig) accountToDetails;
        address account;
        bytes32 taskId;
    }
    mapping(address => Details[]) userToAccountsToDetails;
    //-----
    mapping(address => address[]) public userToPointers;
    //-----

    mapping(address => AccountConfig) public accountToDetails; 


    mapping(bytes4 => bool) authorizedSelectors;
    mapping(address => uint) accountToPayments;

    address[] tokenDatabaseArray;

    uint gasPriceBid;

    ozUpgradeableBeacon beacon;

    bool isEmitter;

    event L2GasPriceChanged(uint newGasPriceBid);
    event DiamondChanged(address newDiamond);
    event NewToken(address token);
    event TokenRemoved(address token);

    /*///////////////////////////////////////////////////////////////
                            Modifiers
    //////////////////////////////////////////////////////////////*/

    /// @dev Checks -using RolesAuthority- if the sender can call certain method
    modifier hasRole(bytes4 functionSig_) {
        require(beacon.canCall(msg.sender, address(this), functionSig_));
        _;
    }

    /// @dev Only allows a call from an account/proxy created through ProxyFactory
    modifier onlyAccount(address user_) {
        // if(accountToDetails[msg.sender].user == address(0)) revert NotAccount();
        // _;

        //------

        bytes memory data;
        address[] memory pointers = userToPointers[user_];
        bool found;

        for (uint i=0; i < pointers.length; i++) {
            data = SSTORE2.read(pointers[i]);
            (address account,,) = abi.decode(data, (address, bytes32, AccountConfig));
            if (account == msg.sender) {
                found = true;
            }
        }
        if (found) {
            _;
        } else {
            revert NotAccount();
        }
    }


    constructor(
        FixedConfig memory fxConfig_,
        EmergencyMode memory eMode_,
        address[] memory tokens_,
        bytes4[] memory selectors_,
        uint gasPriceBid_
    ) {
        fxConfig = FixedConfig({
            inbox: fxConfig_.inbox,
            ops: fxConfig_.ops,
            OZL: fxConfig_.OZL,
            emitter: fxConfig_.emitter,
            gelato: payable(fxConfig_.gelato),
            ETH: fxConfig_.ETH, 
            maxGas: fxConfig_.maxGas
        });

        eMode = EmergencyMode({
            swapRouter: ISwapRouter(eMode_.swapRouter),
            priceFeed: AggregatorV3Interface(eMode_.priceFeed),
            poolFee: eMode_.poolFee,
            tokenIn: eMode_.tokenIn,
            tokenOut: eMode_.tokenOut
        });

        uint length = tokens_.length;
        for (uint i=0; i < length;) {
            tokenDatabase[tokens_[i]] = true;
            tokenDatabaseArray.push(tokens_[i]);
            unchecked { ++i; }
        }

        for (uint i=0; i < selectors_.length;) {
            authorizedSelectors[selectors_[i]] = true;
            unchecked { ++i; }
        }

        gasPriceBid = gasPriceBid_;
    }


    /*///////////////////////////////////////////////////////////////
                        State-changin functions
    //////////////////////////////////////////////////////////////*/

    function saveUserToDetails(
        address account_, 
        AccountConfig calldata acc_
    ) external hasRole(0xcb05ce19) {
        userToAccounts[acc_.user].push(account_);
        accountToDetails[account_] = acc_;
        if (!userDatabase[acc_.user]) userDatabase[acc_.user] = true;
    }

    function saveTaskId(address account_, bytes32 id_) external hasRole(0xf2034a69) {
        taskIDs[account_] = id_;
    }

    function multiSave(
        address account_, 
        AccountConfig calldata acc_, 
        bytes32 taskId_
    ) external hasRole(0x0854b85f) {
        bytes memory data = abi.encode(account_, taskId_, acc_);
        userToPointers[acc_.user].push(SSTORE2.write(data));
    }



    function changeGasPriceBid(uint newGasPriceBid_) external onlyOwner {
        gasPriceBid = newGasPriceBid_;
        emit L2GasPriceChanged(newGasPriceBid_);
    }

    function addTokenToDatabase(address newToken_) external onlyOwner {
        if (queryTokenDatabase(newToken_)) revert TokenAlreadyInDatabase(newToken_);
        tokenDatabase[newToken_] = true;
        tokenDatabaseArray.push(newToken_);
        emit NewToken(newToken_);
    }

    function removeTokenFromDatabase(address toRemove_) external onlyOwner {
        if (!queryTokenDatabase(toRemove_)) revert TokenNotInDatabase(toRemove_);
        tokenDatabase[toRemove_] = false;
        LibCommon.remove(tokenDatabaseArray, toRemove_);
        emit TokenRemoved(toRemove_);
    }

    function storeBeacon(address beacon_) external initializer { 
        beacon = ozUpgradeableBeacon(beacon_);
    }

    function changeEmergencyMode(EmergencyMode calldata newEmode_) external onlyOwner {
        eMode = newEmode_;
    }

    function changeEmitterStatus(bool newStatus_) external onlyOwner {
        isEmitter = newStatus_;
    }

    function storeAccountPayment(uint payment_, address user_) external onlyAccount(user_) {
        accountToPayments[msg.sender] += payment_;
    }

    function addAuthorizedSelector(bytes4 selector_) external onlyOwner {
        authorizedSelectors[selector_] = true;
    }

    function changeDiamond(address newDiamond_) external onlyOwner {
        fxConfig.OZL = newDiamond_;
        emit DiamondChanged(newDiamond_);
    }


    /*///////////////////////////////////////////////////////////////
                            View functions
    //////////////////////////////////////////////////////////////*/

    function isSelectorAuthorized(bytes4 selector_) external view returns(bool) {
        return authorizedSelectors[selector_];
    }

    function getFixedConfig() external view returns(FixedConfig memory) {
        return fxConfig;
    }

    function getGasPriceBid() external view returns(uint) {
        return gasPriceBid; 
    }
    
    function getEmergencyMode() external view returns(EmergencyMode memory) {
        return eMode;
    }

    function getAccountsByUser(
        address user_
    ) external view returns(address[] memory, string[] memory)  {
        address[] memory pointers = userToPointers[user_];
        address[] memory accounts = new address[](pointers.length);
        string[] memory names = new string[](pointers.length);

        for (uint i=0; i < pointers.length; i++) {
            address pointer = pointers[i];

            bytes memory data = SSTORE2.read(pointer);
            (address account, , AccountConfig memory acc) = 
                abi.decode(data, (address, bytes32, AccountConfig));

            accounts[i] = account;
            names[i] = acc.name;
        }
        return (accounts, names);
    }

    function getTaskID(address account_, address owner_) external view returns(bytes32 taskId) {
        Details[] storage deets = userToAccountsToDetails[owner_];
        for (uint i=0; i < deets.length; i++) {
            if (deets[i].account == account_) taskId = deets[i].taskId;
        } // <----- fix
    }

    function getUserByAccount(address account_) external view returns(address) {
        return accountToDetails[account_].user;
    }

    /// @dev If token_ exists in L1 database
    function queryTokenDatabase(address token_) public view returns(bool) {
        return tokenDatabase[token_];
    }
    
    function isUser(address user_) external view returns(bool) {
        return userToPointers[user_].length > 0;
        // return userToAccountsToDetails[user_].length > 0;
    }

    function getEmitterStatus() external view returns(bool) {
        return isEmitter;
    }

    function getTokenDatabase() external view returns(address[] memory) {
        return tokenDatabaseArray;
    }

    function getAccountPayments(address account_) external view returns(uint) {
        return accountToPayments[account_];
    }

    function getDiamond() external view returns(address) {
        return fxConfig.OZL;
    }

    function getPointers(address user_) external view returns(address[] memory) {
        return userToPointers[user_];
    }
}




