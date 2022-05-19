// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {ITri} from '../../interfaces/ICurve.sol';

import '../AppStorage.sol';



contract GettersFacet {
    AppStorage s;
    
    event GetIndex(uint _index);


    function getDistributionIndex() external returns(uint256) { 
        emit GetIndex(s.distributionIndex);
        return s.distributionIndex;
    }


    function getTotalInUSD() public view returns(uint total) {
        uint virtualPrice = ITri(s.tricrypto).get_virtual_price();
        total = virtualPrice * IERC20(s.crvTricrypto).balanceOf(address(this)); //divide between 10 ** 36 to get USD
    }

   

}