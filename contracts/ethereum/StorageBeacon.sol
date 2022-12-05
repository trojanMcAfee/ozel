// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../interfaces/ethereum/IStorageBeacon.sol';
import '../libraries/LibCommon.sol';
import './ozUpgradeableBeacon.sol';
import '../Errors.sol';


contract StorageBeacon is IStorageBeacon, Initializable, Ownable { 

    FixedConfig fxConfig;
    EmergencyMode eMode;

    mapping(address => bytes32) taskIDs;
    mapping(address => bool) tokenDatabase;
    mapping(address => bool) userDatabase;
    mapping(address => address[]) userToAccounts;
    mapping(address => AccountConfig) public accountToDetails; 
    mapping(bytes4 => bool) authorizedSelectors;
    mapping(address => uint) accountToPayments;

    address[] tokenDatabaseArray;

    uint gasPriceBid;

    ozUpgradeableBeacon beacon;

    bool isEmitter;

    event L2GasPriceChanged(uint newGasPriceBid);

    /*///////////////////////////////////////////////////////////////
                            Modifiers
    //////////////////////////////////////////////////////////////*/

    /// @dev Checks -using RolesAuthority- if the sender can call certain method
    modifier hasRole(bytes4 functionSig_) {
        require(beacon.canCall(msg.sender, address(this), functionSig_));
        _;
    }

    /// @dev Only allows a call from an account/proxy created through ProxyFactory
    modifier onlyAccount() {
        if(accountToDetails[msg.sender].user == address(0)) revert NotAccount();
        _;
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

    /// @inheritdoc IStorageBeacon
    function saveUserToDetails(
        address account_, 
        AccountConfig memory accountDetails_
    ) external hasRole(0xcb05ce19) {
        userToAccounts[accountDetails_.user].push(account_);
        accountToDetails[account_] = accountDetails_;
        if (!userDatabase[accountDetails_.user]) userDatabase[accountDetails_.user] = true;
    }

    /// @inheritdoc IStorageBeacon
    function saveTaskId(address account_, bytes32 id_) external hasRole(0xf2034a69) {
        taskIDs[account_] = id_;
    }

    /// @inheritdoc IStorageBeacon
    function changeGasPriceBid(uint newGasPriceBid_) external onlyOwner {
        gasPriceBid = newGasPriceBid_;
        emit L2GasPriceChanged(newGasPriceBid_);
    }

    function addTokenToDatabase(address newToken_) external onlyOwner {
        if (queryTokenDatabase(newToken_)) revert TokenAlreadyInDatabase(newToken_);
        tokenDatabase[newToken_] = true;
        tokenDatabaseArray.push(newToken_);
    }

    function removeTokenFromDatabase(address toRemove_) external onlyOwner {
        if (!queryTokenDatabase(toRemove_)) revert TokenNotInDatabase(toRemove_);
        tokenDatabase[toRemove_] = false;
        LibCommon.remove(tokenDatabaseArray, toRemove_);
    }

    function storeBeacon(address beacon_) external initializer { 
        beacon = ozUpgradeableBeacon(beacon_);
    }

    /// @inheritdoc IStorageBeacon
    function changeEmergencyMode(EmergencyMode calldata newEmode_) external onlyOwner {
        eMode = newEmode_;
    }

    /// @inheritdoc IStorageBeacon
    function changeEmitterStatus(bool newStatus_) external onlyOwner {
        isEmitter = newStatus_;
    }

    /// @dev Stores the ETH transfer made to each proxy/account
    function storeAccountPayment(address account_, uint payment_) external onlyAccount {
        accountToPayments[account_] += payment_;
    }

    /// @inheritdoc IStorageBeacon
    function addAuthorizedSelector(bytes4 selector_) external onlyOwner {
        authorizedSelectors[selector_] = true;
    }


    /*///////////////////////////////////////////////////////////////
                            View functions
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IStorageBeacon
    function isSelectorAuthorized(bytes4 selector_) external view returns(bool) {
        return authorizedSelectors[selector_];
    }

    function getFixedConfig() external view returns(FixedConfig memory) {
        return fxConfig;
    }

    /// @dev Gets the L2 gas price
    function getGasPriceBid() external view returns(uint) {
        return gasPriceBid; 
    }

    function getEmergencyMode() external view returns(EmergencyMode memory) {
        return eMode;
    }

    /// @inheritdoc IStorageBeacon
    function getAccountsByUser(
        address user_
    ) external view returns(address[] memory, string[] memory) {
        address[] memory accounts = userToAccounts[user_];
        string[] memory names = new string[](accounts.length);

        for (uint i=0; i < accounts.length;) {
            names[i] = accountToDetails[accounts[i]].name;
            unchecked { ++i; }
        }
        return (accounts, names);
    }

    /// @inheritdoc IStorageBeacon
    function getTaskID(address account_) external view returns(bytes32) {
        return taskIDs[account_];
    }

    /// @dev Gets the owner of an account
    function getUserByAccount(address account_) external view returns(address) {
        return accountToDetails[account_].user;
    }

    function queryTokenDatabase(address token_) public view returns(bool) {
        return tokenDatabase[token_];
    }

    function isUser(address user_) external view returns(bool) {
        return userDatabase[user_];
    }

    /// @dev Queries if the forwarding to the Emitter is enabled
    function getEmitterStatus() external view returns(bool) {
        return isEmitter;
    }

    function getTokenDatabase() external view returns(address[] memory) {
        return tokenDatabaseArray;
    }

    /// @dev Gets all the ETH transfer done to an account/proxy
    function getAccountPayments(address account_) external view returns(uint) {
        return accountToPayments[account_];
    }
}




