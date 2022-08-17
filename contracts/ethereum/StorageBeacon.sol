// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './ozUpgradeableBeacon.sol';

import { ozERC20Lib } from '../libraries/ozERC20Lib.sol';
// import './FailedFundsETH.sol';
// import { FaultyOzERC20Lib } from '../libraries/ForTesting/FaultyOzERC20Lib.sol';

import 'hardhat/console.sol';


contract StorageBeacon is Initializable, Ownable { 

    struct UserConfig {
        address user;
        address userToken;
        uint userSlippage; 
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

    struct VariableConfig { 
        uint maxSubmissionCost;
        uint gasPriceBid;
        uint autoRedeem;
    }

    struct EmergencyMode {
        ISwapRouter swapRouter;
        AggregatorV3Interface priceFeed; 
        uint24 poolFee;
        address tokenIn;
        address tokenOut; 
    }


    FixedConfig fxConfig;
    VariableConfig varConfig;
    EmergencyMode eMode;

    mapping(address => bytes32) public taskIDs;
    mapping(address => bool) public tokenDatabase;
    mapping(address => bool) public proxyDatabase;
    mapping(address => bool) private userDatabase;
    mapping(uint => UserConfig) public idToUserDetails;
    mapping(address => address) public proxyToUser; 
    mapping(address => address[]) public userToProxy;

    mapping(address => mapping(IERC20 => uint)) public userToFailedERC;
    mapping(address => IERC20[]) public userToFailedTokenCount;

    uint private internalId;

    ozUpgradeableBeacon beacon;

    bool isEmitter;

    address failedFundsContract;


    modifier hasRole(bytes4 functionSig_) {
        require(beacon.canCall(msg.sender, address(this), functionSig_));
        _;
    }


    constructor(
        FixedConfig memory fxConfig_,
        VariableConfig memory varConfig_,
        EmergencyMode memory eMode_,
        address[] memory tokens_,
        address failedFunds_
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

        varConfig = VariableConfig({
            maxSubmissionCost: varConfig_.maxSubmissionCost,
            gasPriceBid: varConfig_.gasPriceBid,
            autoRedeem: varConfig_.autoRedeem
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
            unchecked { ++i; }
        }

        failedFundsContract = failedFunds_;
    }

 

    //State changing functions
    function issueUserID(UserConfig calldata userDetails_) external hasRole(0x74e0ea7a) returns(uint id) {
        idToUserDetails[internalId] = userDetails_;
        id = internalId;
        unchecked { ++internalId; }
    }
    
    function saveUserProxy(address user_, address proxy_) external hasRole(0x68e540e5) {
        userToProxy[user_].push(proxy_);
        proxyToUser[proxy_] = user_;
        proxyDatabase[proxy_] = true;
        console.log('user in saveUserProxy: ', user_);
        userDatabase[user_] = true;
    }

    function saveTaskId(address proxy_, bytes32 id_) external hasRole(0xf2034a69) {
        taskIDs[proxy_] = id_;
    }

    function changeVariableConfig(VariableConfig calldata newVarConfig_) external onlyOwner {
        varConfig = newVarConfig_;
    }

    function addTokenToDatabase(address newToken_) external onlyOwner {
        tokenDatabase[newToken_] = true;
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

    //-------

    function setFailedERCFunds(address user_, IERC20 token_, uint amount_) external {
        if (userToFailedERC[user_][token_] == 0) userToFailedTokenCount[user_].push(token_);
        userToFailedERC[user_][token_] += amount_;
        token_.transfer(failedFundsContract, amount_);
    }



    //View functions
    function getUserDetailsById(uint userId_) external view returns(UserConfig memory) {
        return idToUserDetails[userId_];
    }

    function getFixedConfig() external view returns(FixedConfig memory) {
        return fxConfig;
    }

    function getVariableConfig() external view returns(VariableConfig memory) {
        return varConfig; 
    }

    function getEmergencyMode() external view returns(EmergencyMode memory) {
        return eMode;
    }

    function getProxyByUser(address user_) external view returns(address[] memory) {
        return userToProxy[user_];
    } 

    function getTaskID(address proxy_) external view returns(bytes32) {
        return taskIDs[proxy_];
    }

    function getUserByProxy(address proxy_) external view returns(address) {
        return proxyToUser[proxy_];
    }

    function queryTokenDatabase(address token_) external view returns(bool) {
        return tokenDatabase[token_];
    }

    function isUser(address user_) external view returns(bool) {
        return userDatabase[user_];
    }

    function getEmitterStatus() external view returns(bool) {
        return isEmitter;
    }

    //------

    struct UserFailedFunds {
        address[] erc20s;
        uint[] amounts;
    }

    // function getFailedERCFunds(address user_, address erc20_) external view returns(uint) {
    //     return userToFailedERC[user_][IERC20(erc20_)]; //for front-end when to know that there are failed ERC funds to collect
    // }

    function getFailedERCFunds(address user_) external view returns(UserFailedFunds memory failedConfig) {
        // UserFailedFunds memory failedConfig; 

        uint length = userToFailedTokenCount[user_].length;

        if (length > 0) {
            IERC20[] memory tokens = userToFailedTokenCount[user_];

            for (uint i=0; i < length;) {
                uint amount = userToFailedERC[user_][tokens[i]];

                // address(tokens[i]) = failedConfig.erc20s[i]; 
                // amount = failedConfig.amounts[i];

                failedConfig.erc20s[i] = address(tokens[i]);
                failedConfig.amounts[i] = amount;

                // failedConfig.tokens.push(tokens[i]);
                // failedConfig.amounts.push(amount);


                unchecked { ++i; }
            }
        }




        // return userToFailedERC[user_][IERC20(erc20_)]; 
    }
}




