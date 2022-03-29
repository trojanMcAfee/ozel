//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import './ERC20Facet/IERC20Facet.sol';
import {ITricrypto} from '../interfaces/ICurve.sol';
// import '../libraries/Helpers.sol';
import '../interfaces/ICrvLpToken.sol';
import './ManagerFacet.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../AppStorage.sol';
import '../interfaces/IWETH.sol';

import '../HelpersAbs.sol';
import './ERC4626Facet/ERC4626Facet.sol';



contract VaultFacet { 

    AppStorage s;



    /**
    BTC: 1 / USDT: 0 / WETH: 2
     */

    function getTokenBalance(address token_) public view returns(uint balance) {
        balance = IERC20Facet(token_).balanceOf(address(this));
    }

  

    function getTotalInUSD() public view returns(uint total) {
        uint virtualPrice = s.tricrypto.get_virtual_price();
        total = virtualPrice * s.crvTricrypto.balanceOf(address(this)); //divide between 10 ** 36 to get USD
    }


    

    

   

} 

