// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


// import './DiamondInit.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../AppStorage.sol';



contract GettersFacet {
    AppStorage s;
    
    event GetIndex(uint _index);


    function getDistributionIndex() external returns(uint256) {
        emit GetIndex(s.distributionIndex);
        return s.distributionIndex;
    }

   

}