// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14; 


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/access/Ownable.sol';
import './StorageBeacon.sol';
import '../Errors.sol';


/**
 * @title Forwarding contract for manual redeems.
 * @notice Forwards the address of the account that received a transfer, for a check-up
 * of the tx in case it needs a manual redeem
 */
contract Emitter is Initializable, Ownable {
    address private _beacon;
    address ram;

    event ShowTicket(address indexed proxy);

    /// @dev Stores the beacon (ozUpgradableBeacon)
    function storeBeacon(address beacon_, address random_) external initializer {
        _beacon = beacon_;
        ram = random_;
    }

    /// @dev Gets the first version of the Storage Beacon
    function _getStorageBeacon() private view returns(StorageBeacon) {
        return StorageBeacon(ozUpgradeableBeacon(_beacon).storageBeacon(0));
    }

    /**
     * @dev Forwards the account/proxy to the offchain script that checks for 
     * manual redeems.
     */
    function forwardEvent(address user_) external { 
        address[] memory pointers = _getStorageBeacon().getPointers(user_);
        if (pointers.length == 0) revert NotAccount();
        emit ShowTicket(msg.sender);
    }
}

        



