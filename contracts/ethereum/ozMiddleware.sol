// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import './ozPayMe.sol';
import './StorageBeacon.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../Errors.sol';


contract ozMiddleware is Ownable {

    address private immutable beacon;
    address private payme;

    constructor(address beacon_) {
        beacon = beacon_;
    }

    modifier onlyAccount(address user_) {
        bytes32 acc_user = bytes32(bytes.concat(msg.sender, bytes12(bytes20(user_)));
        if (!_getStorageBeacon(0).verify(user_, bytes32 acc_user_)) revert NotAccount();
        _;
    }


    function forwardCall(
        bytes memory ticketData_,
        address user_,
        uint16 slippage_
    ) external payable onlyAccount(user_) returns(bool isEmergency) {

        (bool success, ) = inbox.call{value: msg.value}(ticketData_); 
        if (!success) {
            /// @dev If it fails the 1st bridge attempt, it decreases the L2 gas calculations
            ticketData = ozPayMe(payme).createTicketData(gasPriceBid_, swapData, true);
            (success, ) = inbox.call{value: msg.value}(ticketData);

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

    function setPayme(address newPayme_) external onlyOwner {
        payme = newPayme_;
    }


}