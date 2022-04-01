//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


// import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
// import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
// import '../interfaces/ICrvLpToken.sol';
// import '../interfaces/IWETH.sol';
// import './ExecutorF.sol';
// import './pyERC4626/pyERC4626.sol';
// import '../interfaces/IYtri.sol';
// import {ITri} from '../interfaces/ICurve.sol';

import 'hardhat/console.sol';

import '../AppStorage.sol';
// import './ExecutorF.sol';




contract PYYFacet { 

    AppStorage s;

    

    function getHi() public {
        bytes memory x = abi.encode(0x8da9b772);
        console.log('s.executor in getHi: ', s.executor);
        (bool success, ) = s.executor.delegatecall(x);
        require(success, 'failedd');
    }



    function exchangeToUserToken(address _user, address _userToken) public payable { 
        getHi();
        revert('herere');
    }

  

}