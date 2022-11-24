// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../libraries/LibCommon.sol';
import './ozUpgradeableBeacon.sol';
import '../Errors.sol';

import 'hardhat/console.sol';


contract StorageBeacon is Initializable, Ownable { 

    struct UserConfig {
        address user;
        address userToken;
        uint userSlippage; 
        string accountName;
    }

    struct FixedConfig {  
        address inbox;
        address ops;
        address OZL;
        address emitter;
        address payable gelato;
        address ETH; 
        uint maxGas;
    }

    struct EmergencyMode {
        ISwapRouter swapRouter;
        AggregatorV3Interface priceFeed; 
        uint24 poolFee;
        address tokenIn;
        address tokenOut; 
    }


    FixedConfig fxConfig;
    EmergencyMode eMode;

    mapping(address => bytes32) taskIDs;
    mapping(address => bool) tokenDatabase;
    mapping(address => bool) userDatabase;
    mapping(address => address) proxyToUser; 

    mapping(address => address[]) userToProxies;
    mapping(address => UserConfig) public proxyToDetails; 
    mapping(bytes4 => bool) authorizedSelectors;


    mapping(address => mapping(IERC20 => uint)) userToFailedERC;
    mapping(address => IERC20[]) userToFailedTokenCount;
    mapping(address => uint) proxyToPayments;

    address[] tokenDatabaseArray;

    uint private internalId;
    uint gasPriceBid;

    ozUpgradeableBeacon beacon;

    bool isEmitter;

    modifier hasRole(bytes4 functionSig_) {
        require(beacon.canCall(msg.sender, address(this), functionSig_));
        _;
    }

    modifier onlyProxy() {
        if(proxyToDetails[msg.sender].user == address(0)) revert NotProxy();
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

 

    //State changing functions
    function saveUserToDetails(
        address proxy_, 
        UserConfig memory userDetails_
    ) external hasRole(0xcb05ce19) {
        userToProxies[userDetails_.user].push(proxy_);
        proxyToDetails[proxy_] = userDetails_;
        if (!userDatabase[userDetails_.user]) userDatabase[userDetails_.user] = true;
    }

    function saveTaskId(address proxy_, bytes32 id_) external hasRole(0xf2034a69) {
        taskIDs[proxy_] = id_;
    }

    function changeGasPriceBid(uint newGasPriceBid_) external onlyOwner {
        gasPriceBid = newGasPriceBid_;
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

    function changeEmergencyMode(EmergencyMode calldata newEmode_) external onlyOwner {
        eMode = newEmode_;
    }

    function changeEmitterStatus(bool newStatus) external onlyOwner {
        isEmitter = newStatus;
    }

    function storeProxyPayment(address proxy_, uint payment_) external onlyProxy {
        proxyToPayments[proxy_] += payment_;
    }

    function addAuthorizedSelector(bytes4 selector_) external onlyOwner {
        authorizedSelectors[selector_] = true;
    }


    //View functions
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

    function getProxyByUser(
        address user_
    ) external view returns(address[] memory, string[] memory) {
        address[] memory proxies = userToProxies[user_];
        string[] memory names = new string[](proxies.length);

        for (uint i=0; i < proxies.length;) {
            names[i] = proxyToDetails[proxies[i]].accountName;
            unchecked { ++i; }
        }
        return (proxies, names);
    }

    function getTaskID(address proxy_) external view returns(bytes32) {
        return taskIDs[proxy_];
    }

    function getUserByProxy(address proxy_) external view returns(address) {
        return proxyToDetails[proxy_].user;
    }

    function queryTokenDatabase(address token_) public view returns(bool) {
        return tokenDatabase[token_];
    }

    function isUser(address user_) external view returns(bool) {
        return userDatabase[user_];
    }

    function getEmitterStatus() external view returns(bool) {
        return isEmitter;
    }

    function getTokenDatabase() external view returns(address[] memory) {
        return tokenDatabaseArray;
    }

    function getProxyPayments(address proxy_) external view returns(uint) {
        return proxyToPayments[proxy_];
    }
}




