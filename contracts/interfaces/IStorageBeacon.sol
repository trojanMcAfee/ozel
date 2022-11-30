// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';


interface IStorageBeacon {

    struct AccountConfig {
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

    /**
     * @dev Saves and connects -in a mapping- the proxy/account to the details of
     * the user who created it.
     * @param proxy_ The account/proxy
     * @param accountDetails_ Details of the account/proxy
     */
    function saveUserToDetails(
        address proxy_, 
        AccountConfig memory accountDetails_
    ) external;

    /**
     * @dev Stores the Gelato task. Can only be called by the Proxy Factory. 
     * @param proxy_ Address of the account/proxy
     * @param id_ ID number of the Gelato task
     */
    function saveTaskId(address proxy_, bytes32 id_) external;

    /**
     * @dev Changes the hard-coded L2 gas price
     * @param newGasPriceBid_ New gas price expressed in gwei
     */
    function changeGasPriceBid(uint newGasPriceBid_) external;

    /**
     * @dev Changes all the params on the Emergency Mode struct
     * @param newEmode_ New eMode struct
     */
    function changeEmergencyMode(EmergencyMode calldata newEmode_) external;

    /**
     * @dev Disables/Enables the forwarding to Emitter on ozPayMe 
     * @param newStatus_ New boolean for the forwading to the Emitter
     */
    function changeEmitterStatus(bool newStatus_) external;

    /**
     * @dev Authorizes  a new function so it can get called with its original 
     * calldata -on ozBeaconProxy (each user's account/proxy)- to the implementation (ozPayMe)
     * instead of just forwarding the user details for briding to L2. 
     * @param selector_ Selector of new authorized function
     */
    function addAuthorizedSelector(bytes4 selector_) external;

    /**
     * @notice View method related to the one above
     * @dev Queries if a function's payload will get to the implementation or if it'll be 
     * substituted by the bridging payload on ozBeaconProxy. If it's authorized, it'll keep
     * the original calldata.
     * @param selector_ Selector of the authorized function in the implementation
     * @return bool If the target function is authorized to keep its calldata
     */
    function isSelectorAuthorized(bytes4 selector_) external view returns(bool);

    /**
     * @notice Gets the accounts/proxies created by an user
     * @dev Gets the addresses and names of the proxies
     * @param user_ Address of the user
     * @return address[] Addresses of the accounts
     * @return string[] Names of the accounts
     */
    function getAccountsByUser(
        address user_
    ) external view returns(address[] memory, string[] memory);

    /**
     * @dev Gets the Gelato task of an account/proxy
     * @param proxy_ Account
     * @return bytes32 Gelato Task ID
     */
    function getTaskID(address proxy_) external view returns(bytes32);
}


