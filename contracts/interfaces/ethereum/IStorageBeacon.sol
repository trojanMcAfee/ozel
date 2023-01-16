// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';


interface IStorageBeacon {

    struct AccountConfig {
        address user;
        address token;
        uint slippage; 
        string name;
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

    struct FixedConfig2 {  
        address ops;
        address payable gelato;
        address inbox;
        address emitter;
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
     * @dev Saves and connects the address of the account to its details.
     * @param account_ The account/proxy
     * @param accountDetails_ Details of the account/proxy
     */
    // function saveUserToDetails(
    //     address account_, 
    //     AccountConfig memory accountDetails_
    // ) external;

    /**
     * @dev Stores the Gelato task. Can only be called by the Proxy Factory. 
     * @param account_ Address of the account/proxy
     * @param id_ ID of the Gelato task
     */
    // function saveTaskId(address account_, bytes32 id_) external;

    /**
     * @dev Changes the hard-coded L2 gas price
     * @param newGasPriceBid_ New gas price expressed in gwei
     */
    function changeGasPriceBid(uint newGasPriceBid_) external;

    /// @dev Adds a new token to L1 database
    function addTokenToDatabase(address newToken_) external;

    /// @dev Removes a token from L1 database
    function removeTokenFromDatabase(address toRemove_) external;

    /// @dev Stores the beacon (ozUpgradableBeacon)
    function storeBeacon(address beacon_) external;

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

    /// @dev Stores the ETH transfer made to each proxy/account
    // function storeAccountPayment(address account_, uint payment_) external;

    /**
     * @dev Authorizes a new function so it can get called with its original 
     * calldata -on ozAccountProxy (each user's account/proxy)- to the implementation (ozPayMe)
     * instead of just forwarding the account details for briding to L2. 
     * @param selector_ Selector of new authorized function
     */
    function addAuthorizedSelector(bytes4 selector_) external;

    /**
     * @notice View method related to the one above
     * @dev Queries if a function's payload will get to the implementation or if it'll be 
     * substituted by the bridging payload on ozAccountProxy. If it's authorized, it'll keep
     * the original calldata.
     * @param selector_ Selector of the authorized function in the implementation
     * @return bool If the target function is authorized to keep its calldata
     */
    function isSelectorAuthorized(bytes4 selector_) external view returns(bool);

    /// @dev Gets the Fixed Config struct
    function getFixedConfig() external view returns(FixedConfig memory);

    /// @dev Gets the L2 gas price
    function getGasPriceBid() external view returns(uint);

    /// @dev Gets the Emergency Mode struct
    function getEmergencyMode() external view returns(EmergencyMode memory);

    /**
     * @notice Gets the accounts/proxies created by an user
     * @dev Gets the addresses and names of the accounts
     * @param user_ Address of the user
     * @return address[] Addresses of the accounts
     * @return string[] Names of the accounts
     */
    function getAccountsByUser(
        address user_
    ) external view returns(address[] memory, string[] memory);

    /**
     * @dev Gets the Gelato task of an account/proxy
     * @param account_ Account
     * @param owner_ Owner of the task
     * @return bytes32 Gelato Task ID
     */
    function getTaskID(address account_, address owner_) external view returns(bytes32);

    /// @dev Gets the owner of an account
    // function getUserByAccount(address account_) external view returns(address);

    /// @dev If user_ has previously created an account/proxy
    function isUser(address user_) external view returns(bool);

    /// @dev Queries if the forwarding to the Emitter is enabled
    function getEmitterStatus() external view returns(bool);

    /// @dev Gets all the tokens in the database
    function getTokenDatabase() external view returns(address[] memory);

    /// @dev Gets all the gross ETH transfers (without the Gelato's execution fees) done to an account/proxy
    // function getAccountPayments(address account_) external view returns(uint);
}


