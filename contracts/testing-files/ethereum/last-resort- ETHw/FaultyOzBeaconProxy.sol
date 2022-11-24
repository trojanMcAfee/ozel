// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';
import '../../../ethereum/StorageBeacon.sol';


contract FaultyOzBeaconProxy is ReentrancyGuard, Initializable, BeaconProxy { 

    StorageBeacon.UserConfig userDetails;
    StorageBeacon.FixedConfig fxConfig;

    address private beacon; 

    event FundsToArb(address indexed proxy, address indexed sender, uint amount);
    
    constructor(
        address beacon_,
        bytes memory data_
    ) BeaconProxy(beacon_, data_) {}                                    


    receive() external payable override {}
}