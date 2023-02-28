// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/utils/Address.sol';
import '../facets/ozLoupeFacetV1_1.sol';


contract ozAccountTest is BeaconProxy {

    bool private _initialized;
    bool private _initializing;

    bytes accData;

    address private immutable OZL;

    constructor(
        address beacon_,
        address ozDiamond_
    ) BeaconProxy(beacon_, new bytes(0)) {
        OZL = ozDiamond_;
    }


    function _delegate(address implementation) internal override {
        if ( ozLoupeFacetV1_1(OZL).isSelectorAuthorized(bytes4(msg.data)) ) { 
            assembly {
                calldatacopy(0, 0, calldatasize())
                let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)
                returndatacopy(0, 0, returndatasize())

                switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
            }
        }
    }
}