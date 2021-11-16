// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import './DiamondInit.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';




contract Getters {
    // AppStorage public s;
    
    DiamondInit init;

    constructor(address _init) {
        init = DiamondInit(_init);
    }

    // function diamondStorage() internal pure returns(AppStorage storage ds) {
    //     assembly {
    //         ds.slot := 0
    //     }
    // }

    function getDistributionIndex() external view returns(address) {
        // AppStorage storage s = diamondStorage();
        // return address(s.renBTC);
        (,,,,,,,IERC20 renBTC,,,,,,,,,,) = init.s();
        return address(renBTC);
    }

    // function logVar() external view {
    //     // AppStorage storage s = diamondStorage();
    //     console.log('renBTC ex: ', address(s.renBTC));
    // }

}