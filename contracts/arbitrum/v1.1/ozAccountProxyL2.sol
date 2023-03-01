// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol';
// import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/utils/Address.sol';
import './facets/ozLoupeFacetV1_1.sol';
// import '../../Errors.sol';


/**
 * @title Receiver of an user's ETH transfers (aka THE account)
 * @notice Proxy that users create where they will receive all ETH transfers,
 * which would be converted to the stablecoin of their choosing.
 */
contract ozAccountProxyL2 is BeaconProxy {

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

    /**
     * @notice Forwards payload to the implementation
     * @dev Queries between the authorized selectors. If true, keeps the msg.sender via delegatecall.
     * If false, it forwards the msg.sender via call. 
     * @param implementation Address of the implementation connected to each account
     */
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
        } else {
            bytes memory payload = abi.encodeWithSignature(
                'exchangeToAccountToken(bytes,uint256,address)', 
                accData,
                msg.value,
                address(this)
            );

            (bool success,) = implementation.call{value: msg.value}(payload);
            require(success);
        }
    }
}