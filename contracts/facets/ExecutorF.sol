//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


// import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
// import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../AppStorage.sol';

// import {IMulCurv} from '../interfaces/ICurve.sol';

import 'hardhat/console.sol';


contract ExecutorF { 

    AppStorage s;


    function getHello() public view {
        console.log('msg.sender in exec: ', msg.sender);
        console.log('hello world');
    }


}