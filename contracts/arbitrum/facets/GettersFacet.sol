// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {ITri} from '../../interfaces/ICurve.sol';

import '../AppStorage.sol';



contract GettersFacet {
    AppStorage s;
    
    event GetIndex(uint index);
    event GetCounter(uint counter);


    function getOzelIndex() external returns(uint) { 
        emit GetIndex(s.ozelIndex);
        return s.ozelIndex;
    }


    function getTotalInUSD() public view returns(uint total) {
        uint virtualPrice = ITri(s.tricrypto).get_virtual_price();
        total = virtualPrice * IERC20(s.crvTricrypto).balanceOf(address(this)); //divide between 10 ** 36 to get USD
    }


    function getRegulatorCounter() external returns(uint) {
        emit GetCounter(s.regulatorCounter);
        return s.regulatorCounter;
    }

   

}