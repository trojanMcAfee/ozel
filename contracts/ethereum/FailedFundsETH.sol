// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import './StorageBeacon.sol';
import '../Errors.sol';



contract FailedFundsETH is Initializable { 

    StorageBeacon sBeacon;

    modifier withFailedFunds() {
        sBeacon.getFailedERCFunds(msg.sender) revert NotAuthorized(msg.sender);
        _;
    }

    


    function setStorageBeacon(address sBeacon_) external initializer {
        sBeacon = StorageBeacon(sBeacon_);
    }

    function withdraw() external withFailedFunds {

    }

}