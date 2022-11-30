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

    event ShowTicket(address indexed proxy);


    function storeBeacon(address beacon_) external initializer {
        _beacon = beacon_;
    }

    function _getStorageBeacon() private view returns(StorageBeacon) {
        return StorageBeacon(ozUpgradeableBeacon(_beacon).storageBeacon(0));
    }

    function forwardEvent() external { 
        (address user,,,) = _getStorageBeacon().accountToDetails(msg.sender);
        if (user == address(0)) revert NotAccount();
        emit ShowTicket(msg.sender);
    }
}

        



