// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import {LibDiamond} from "../../libraries/LibDiamond.sol";
import { IDiamondLoupe } from "../../interfaces/IDiamondLoupe.sol";
import { IDiamondCut } from "../../interfaces/IDiamondCut.sol";
import { IERC173 } from "../../interfaces/IERC173.sol";
import { IERC165 } from "../../interfaces/IERC165.sol";
import '../AppStorage.sol'; 
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import 'hardhat/console.sol';

import '../../interfaces/IWETH.sol';





contract DiamondInit {    

    AppStorage s;
    // You can add parameters to this function in order to pass in 
    // data to set your own state variables
    function init(LibDiamond.VarsAndAddresses memory vars_) external {
        // adding ERC165 data
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;

        //Sets addresses on contracts
        s.OZL = vars_.contracts[0]; 
        s.tricrypto = vars_.contracts[1];
        s.crvTricrypto = vars_.contracts[2];
        s.getters = vars_.contracts[3];
        s.renPool = vars_.contracts[4];
        s.mimPool = vars_.contracts[5];
        s.crv2Pool = vars_.contracts[6];
        s.yTriPool = vars_.contracts[7];
        s.fraxPool = vars_.contracts[8];
        s.executor = vars_.contracts[9];
        s.oz46 = vars_.contracts[10]; 
        s.oz20 = vars_.contracts[11];

        //Sets ERC20 instances
        s.USDT = vars_.erc20s[0];
        s.WBTC = vars_.erc20s[1];
        s.renBTC = vars_.erc20s[2];
        s.USDC = vars_.erc20s[3];
        s.MIM = vars_.erc20s[4];
        s.WETH = vars_.erc20s[5];
        s.FRAX = vars_.erc20s[6];

        //Set up the tokens database
        uint length = vars_.tokensDb.length;
        for (uint i=0; i < length;) {
            s.tokenDatabase[vars_.tokensDb[i]] = true;
            unchecked { ++i; }
        }

        //Sets app's general variables
        s.dappFee = vars_.appVars[0];
        s.defaultSlippage = vars_.appVars[1];

        //Sets name and symbol on PayToken (OZL)
        s.oz.name = vars_.ozlVars[0];
        s.oz.symbol = vars_.ozlVars[1];

        //Sets ETH address
        s.ETH = vars_.ETH;

        /*** Sets the structs for userTokens
        renPool -->  renBTC: 1 / WBTC: 0
        mimPool --> MIM: 0 / USDT: 2 / USDC: 1
        crv2Pool --> /USDC: 0 / USDT: 1
        fraxPool --> FRAX: 0 / USDT: 2 / USDC: 1 ***/
        s.renSwap = TradeOps(0, 1, s.WBTC, s.renBTC, s.renPool);
        s.mimSwap = TradeOps(2, 0, s.USDT, s.MIM, s.mimPool);
        s.usdcSwap = TradeOps(1, 0, s.USDT, s.USDC, s.crv2Pool);
        s.fraxSwap = TradeOps(2, 0, s.USDT, s.FRAX, s.fraxPool);

        //Array of structs
        s.swaps.push(s.renSwap);
        s.swaps.push(s.mimSwap);
        s.swaps.push(s.usdcSwap);
        s.swaps.push(s.fraxSwap);


        s.invariant = 10 ** 14;
        s.invariant2 = 10 ** 8;
        s.indexRegulator = 0;
        s.invariantRegulator = 1;
        s.stabilizer = 12000; 
        s.invariantRegulatorLimit = type(uint).max / s.invariant;
        s.regulatorCounter = 0;
     

        // add your own state variables 
        // EIP-2535 specifies that the `diamondCut` function takes two optional 
        // arguments: address _init and bytes calldata _calldata
        // These arguments are used to execute an arbitrary function using delegatecall
        // in order to set state variables in the diamond during deployment or an upgrade
        // More info here: https://eips.ethereum.org/EIPS/eip-2535#diamond-interface 
    }
}


