// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


// import './DiamondInit.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import '../AppStorage.sol';



contract GettersFacet {
    AppStorage s;
    
    event GetIndex(uint _index);

    // function diamondStorage() internal pure returns(AppStorage storage ds) {
    //     assembly {
    //         ds.slot := 0
    //     }
    // }

    function getDistributionIndex() external returns(uint256) {
        // AppStorage storage s = diamondStorage();
        // (,,,,,,,IERC20 renBTC,,,,,,,,,,) = init.s();
        emit GetIndex(s.distributionIndex);
        // return address(s.USDT);
        return s.distributionIndex;
    }

    // function logVar() external view {
    //     // AppStorage storage s = diamondStorage();
    //     console.log('renBTC ex: ', address(s.renBTC));
    // }

}