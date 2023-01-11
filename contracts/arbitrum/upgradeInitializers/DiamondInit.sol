// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import { IDiamondLoupe } from "../../interfaces/arbitrum/IDiamondLoupe.sol";
import { IDiamondCut } from "../../interfaces/arbitrum/IDiamondCut.sol";
import { LibDiamond } from "../../libraries/LibDiamond.sol";
import { IERC173 } from "../../interfaces/arbitrum/IERC173.sol";
import { IERC165 } from "../../interfaces/arbitrum/IERC165.sol";
import '../AppStorage.sol'; 


/**
 * @notice Initializer of the storage variables
 */
contract DiamondInit {    

    AppStorage s;
    
    function init(LibDiamond.VarsAndAddresses calldata vars_) external {
        //Adding ERC165 data
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;

        //Addresses on contracts
        s.tricrypto = vars_.contracts[0];
        s.crvTricrypto = vars_.contracts[1];
        s.mimPool = vars_.contracts[2];
        s.crv2Pool = vars_.contracts[3];
        s.yTriPool = vars_.contracts[4];
        s.fraxPool = vars_.contracts[5];
        s.executor = vars_.contracts[6];
        s.oz20 = vars_.contracts[7];

        //ERC20 addresses
        s.USDT = vars_.erc20s[0];
        s.WBTC = vars_.erc20s[1];
        s.USDC = vars_.erc20s[2];
        s.MIM = vars_.erc20s[3];
        s.WETH = vars_.erc20s[4];
        s.FRAX = vars_.erc20s[5];

        //Tokens database
        uint length = vars_.tokensDb.length;
        for (uint i=0; i < length;) {
            address l1Address = vars_.tokensDb[i].l1Address;
            address l2Address = vars_.tokensDb[i].l2Address;

            s.tokenDatabase[l2Address] = true;
            s.tokenL1ToTokenL2[l1Address] = l2Address;
            unchecked { ++i; }
        }

        //System's general variables
        s.protocolFee = vars_.appVars[0];
        s.defaultSlippage = vars_.appVars[1];

        //Name and Symbol on OZL
        s.oz.name = vars_.ozlVars[0];
        s.oz.symbol = vars_.ozlVars[1];

        //ETH address
        s.ETH = vars_.ETH;

        /**
         * Structs for token swaps (using Curve's token codes)
         * mimPool --> MIM: 0 / USDT: 2 / USDC: 1
         * crv2Pool --> /USDC: 0 / USDT: 1
         * fraxPool --> FRAX: 0 / USDT: 2 / USDC: 1
         */
        s.mimSwap = TradeOps(2, 0, s.USDT, s.MIM, s.mimPool);
        s.usdcSwap = TradeOps(1, 0, s.USDT, s.USDC, s.crv2Pool);
        s.fraxSwap = TradeOps(2, 0, s.USDT, s.FRAX, s.fraxPool);

        //Array of swap structs
        s.swaps.push(s.mimSwap);
        s.swaps.push(s.usdcSwap);
        s.swaps.push(s.fraxSwap);

        //Stabilizing mechanism variables
        s.invariant = 10 ** 14;
        s.invariant2 = 10 ** 8;
        s.indexRegulator = 0;
        s.invariantRegulator = 1;
        s.stabilizer = 12000; 
        s.invariantRegulatorLimit = type(uint).max / s.invariant;
        s.regulatorCounter = 0;

        //Revenue vars
        s.priceFeed = AggregatorV3Interface(vars_.contracts[8]);
        s.swapRouter = ISwapRouter(vars_.contracts[9]);
        s.revenueToken = s.USDC;
        s.poolFee = uint24(vars_.appVars[2]);
        s.revenueAmounts = vars_.revenueAmounts;

        //Mutex bitmap locks
        s.bitLocks[0] = 255;  //noReentrancy
        s.bitLocks[1] = 255; //isAuthorized

        //Misc vars
        s.checkForRevenueSelec = abi.encodeWithSignature('checkForRevenue()');
        s.nullAddress = 0x0000000000000000000000000000000000000000;
        s.l1Check = true;


        // add your own state variables 
        // EIP-2535 specifies that the `diamondCut` function takes two optional 
        // arguments: address _init and bytes calldata _calldata
        // These arguments are used to execute an arbitrary function using delegatecall
        // in order to set state variables in the diamond during deployment or an upgrade
        // More info here: https://eips.ethereum.org/EIPS/eip-2535#diamond-interface 
    }
}


