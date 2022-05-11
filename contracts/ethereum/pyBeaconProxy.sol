// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


import 'hardhat/console.sol';

import '@openzeppelin/contracts/utils/Address.sol';

import '@openzeppelin/contracts/proxy/beacon/IBeacon.sol';
import '@openzeppelin/contracts/proxy/Proxy.sol';
import '@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol';

import '../interfaces/IOps.sol';



contract pyBeaconProxy is Proxy, ERC1967Upgrade {
    using Address for address;
    
    address storageBeacon;

    address inbox;
    address opsGel;
    address payable public immutable gelato;
    address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    struct userConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }

    struct BridgeConfig { //remove from here the vars that are passed to the constructor
        address inbox; //finish modifying OpsReady
        address opsGel;
        address PYY;
        address emitter;
        uint maxSubmissionCost;
        uint maxGas;
        uint gasPriceBid;
        uint autoRedeem;
    }

    
    constructor(
        address beacon, 
        address storageBeacon_, 
        address inbox_,
        address opsGel_,
        bytes memory data
    ) {
        assert(_BEACON_SLOT == bytes32(uint256(keccak256("eip1967.proxy.beacon")) - 1));
        _upgradeBeaconToAndCall(beacon, data, false);
        storageBeacon = storageBeacon_;

        inbox = inbox_;
        opsGel = opsGel_;
        gelato = IOps(opsGel_).gelato();    //PYY is the diamond. Add it here as a constructor varible, along emitter
    }                                       //and the other gas vars that are constants. Pass as less vars as possible to sendToArb

    /**
     * @dev Returns the current beacon address.
     */
    function _beacon() internal view virtual returns (address) {
        return _getBeacon();
    }

    /**
     * @dev Returns the current implementation address of the associated beacon.
     */
    function _implementation() internal view virtual override returns (address) {
        return IBeacon(_getBeacon()).implementation();
    }

    /**
     * @dev Changes the proxy to use a new beacon. Deprecated: see {_upgradeBeaconToAndCall}.
     *
     * If `data` is nonempty, it's used as data in a delegate call to the implementation returned by the beacon.
     *
     * Requirements:
     *
     * - `beacon` must be a contract.
     * - The implementation returned by `beacon` must be a contract.
     */
    function _setBeacon(address beacon, bytes memory data) internal virtual {
        _upgradeBeaconToAndCall(beacon, data, false);
    } 

    /**
     * MY FUNCTIONS
     */


    //Gelato checker
    function checker(
        uint internalId_
    ) external view returns(bool canExec, bytes memory execPayload) {
        if (address(this).balance > 0) {
            canExec = true;
        }
        // execPayload = abi.encodeWithSelector(
        //     this.sendToArb.selector, s.autoRedeem
        // );

        execPayload = abi.encodeWithSignature('sendToArb(uint256)', internalId_);
    }

    receive() external payable override {
        // require(msg.data.length > 0, "BeaconProxy: Receive() can only take ETH"); //<------ try what happens if sends eth with calldata (security)
    }
 

    function _delegate(address implementation) internal override {
        uint internalId = abi.decode(msg.data[4:], (uint));

        bytes memory data = abi.encodeWithSignature('getStorage(uint256)', internalId);
        data = storageBeacon.functionCall(data, 'pyBeaconProxy: _delegate() call failed');

        (
            userConfig memory userDetails,
            BridgeConfig memory bridgeConfig
        ) = abi.decode(
            data,
            (userConfig, BridgeConfig)
        );

        data = abi.encodeWithSignature(
            'sendToArb((address,address,uint256),(address,address,address,address,uint256,uint256,uint256,uint256))', 
            userDetails,
            bridgeConfig
        );

        assembly {
            // Call the implementation.
            // out and outsize are 0 because we don't know the size yet.
            let result := delegatecall(gas(), implementation, add(data, 32), mload(data), 0, 0)

            // Copy the returned data.
            returndatacopy(0, 0, returndatasize())

            switch result
            // delegatecall returns 0 on error.
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }

    }


}





