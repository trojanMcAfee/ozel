// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';


struct AppStorage { //check if all variables here are used
    //Contracts
    // address OZL; 
    address tricrypto;
    address crvTricrypto; 
    address renPool;
    address mimPool;
    address crv2Pool;
    address yTriPool;
    address fraxPool;
    address executor;

    //ERC20s
    address USDT;
    address WBTC;
    address renBTC;
    address USDC;
    address MIM;
    address WETH;
    address FRAX;
    address ETH;

    //Token infrastructure
    // address oz46;
    address oz20;

    //System config
    uint dappFee;
    uint defaultSlippage;
    mapping(address => bool) tokenDatabase;

    //Internal accounting vars
    uint totalVolume;
    uint ozelIndex;
    uint feesVault;
    uint failedFees;
    mapping(address => uint) usersPayments;
    // mapping(address => mapping(IERC20 => uint)) userToFailedERC;

    OZLERC20 oz;

    //Curve swaps config **** code how to easily add a new swap
    TradeOps renSwap;
    TradeOps mimSwap;
    TradeOps usdcSwap;
    TradeOps fraxSwap;
    TradeOps[] swaps;

    bool isEnabled;

    //Mutex locks
    mapping(uint => uint) bitLocks;

    //Stabilizing mechanism (for ozelIndex)
    uint invariant;
    uint invariant2;
    uint indexRegulator;
    uint invariantRegulator;
    bool indexFlag;
    uint stabilizer;
    uint invariantRegulatorLimit;
    uint regulatorCounter;

    //Revenue vars (order this)
    ISwapRouter swapRouter;
    AggregatorV3Interface priceFeed;
    address revenueToken;
    uint24 poolFee;
    uint[] revenueAmounts;
    // bytes revenueCalldata;
    // address revenue;

}

struct OZLERC20 {
    mapping(address => mapping(address => uint256)) allowances;
    string  name;
    string  symbol;
}

struct TradeOps {
    int128 tokenIn;
    int128 tokenOut;
    address baseToken;
    address userToken;  
    address pool;
}

struct UserConfig { 
    address user;
    address userToken;
    uint userSlippage; 
}





