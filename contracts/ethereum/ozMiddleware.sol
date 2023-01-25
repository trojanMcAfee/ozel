// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import './ozPayMe.sol';
import './StorageBeacon.sol';


contract ozMiddleware {

    address private immutable beacon;

    constructor(address beacon_) {
        StorageBeacon(_getStorageBeacon(0)).
        beacon = beacon_;
    }

    modifier onlyAccount() {
        if ()

        /**
            Verify here if msg.sender is an account. Also used in runEmergency in ozPayMe.

            Could use Emitter's verify(), and there might be a way to refactor verify() so
            only acc_user is needed to verify if an account made the call...check this.

            Seems like it's not possible since the user is necessary to pull AccData from the mapping.

            If so, use sBeacon's verify() to check that msg.sender is an account.

            Check the gas consumption of all of this.
         */
    }


    function forwardCall(
        bytes memory ticketData_,
        address user_,
        uint16 slippage_
    ) external onlyAccount returns(bool isEmergency) {

        (bool success, ) = inbox.call{value: address(this).balance}(ticketData_); 
        if (!success) {
            /// @dev If it fails the 1st bridge attempt, it decreases the L2 gas calculations
            ticketData = ozPayMe(payme).createTicketData(gasPriceBid_, swapData, true);
            (success, ) = inbox.call{value: address(this).balance}(ticketData);

            if (!success) {
                bytes memory eData = abi.encodeWithSelector(
                    ozPayMe(payme).runEmergencyMode.selector, 
                    user_, slippage_
                );
                (success, ) = payme.delegatecall(eData);
                require(success);

                isEmergency = true;
                emit EmergencyTriggered(user, amountToSend_);
            }
        }
    }

    /// @dev Gets a version of the Storage Beacon
    function _getStorageBeacon(uint version_) private view returns(address) {
        return ozUpgradeableBeacon(beacon).storageBeacon(version_);
    }


}