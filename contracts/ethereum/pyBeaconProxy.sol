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
    
    // address storageBeacon;

    // address inbox;
    // address opsGel;
    // address payable public immutable gelato;
    // address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    // address PYY;
    // address emitter;

    struct UserConfig {
        address user;
        address userToken;
        uint userSlippage; 
    }

    // struct BridgeConfig {
    //     address inbox; //finish modifying OpsReady
    //     address opsGel;
    //     address PYY;
    //     address emitter;
    //     uint maxSubmissionCost;
    //     uint maxGas;
    //     uint gasPriceBid;
    //     uint autoRedeem;
    // }


    struct FixedConfig {
        address beacon;
        address inbox; 
        address opsGel; 
        address gelato;
        address PYY;
        address emitter;
        address storageBeacon;
        uint maxGas;
    }

    // FixedConfig fxConfig; //userDetails can be stored locally on each proxy and be modified locally

    struct VariableConfig {
        uint maxSubmissionCost;
        uint gasPriceBid;
        uint autoRedeem;
    }

    FixedConfig fxConfig;
    UserConfig userDetails;

    address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    
    constructor(
        UserConfig memory userDetails_,
        FixedConfig memory fxConfig_,
        bytes memory data
    ) {
        assert(_BEACON_SLOT == bytes32(uint256(keccak256("eip1967.proxy.beacon")) - 1)); //PYY is the diamond. Add it here as a constructor varible, along emitter
        _upgradeBeaconToAndCall(fxConfig_.beacon, data, false); //and the other gas vars that are constants. Pass as less vars as possible to sendToArb
      
        fxConfig = fxConfig_;
        userDetails = userDetails_;                 
    }                                    

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
        // uint internalId = abi.decode(msg.data[4:], (uint));

        bytes memory data = abi.encodeWithSignature('getVariableData()');
        data = storageBeacon.functionCall(data, 'pyBeaconProxy: _delegate() call failed');

        (VariableConfig memory varConfig) = abi.decode(data, (VariableConfig));

        data = abi.encodeWithSignature(
            'sendToArb((uint256,uint256,uint256))', 
            varConfig
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





