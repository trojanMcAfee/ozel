// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@openzeppelin/contracts/proxy/Proxy.sol';


contract ozAccountL2 is Proxy, Initializable {

    bytes accData;

    address private constant OZL = 0x7D1f13Dd05E6b0673DC3D0BFa14d40A74Cfa3EF2;

    //--------

    function checker() external view returns(bool canExec, bytes memory execPayload) { 
        uint amountToSend = address(this).balance;
        if (amountToSend > 0) canExec = true;
        execPayload = abi.encodeWithSignature('sendToArb(uint256)', amountToSend); 
    }

    function _implementation() internal pure override returns(address) {
        return OZL;
    }

    function initialize(bytes memory accData_) external initializer {
        accData = accData_;
    }

    //-------

    function _delegate(address implementation) internal override { 
        bytes memory data; 
        StorageBeacon storageBeacon = _getStorageBeacon();

        if ( storageBeacon.isSelectorAuthorized(bytes4(msg.data)) ) { 
            data = msg.data;
        } else {
            uint amountToSend = abi.decode(msg.data[4:], (uint));

            data = abi.encodeWithSignature(
                'sendToArb(uint256,uint256,address)', 
                storageBeacon.getGasPriceBid(),
                amountToSend,
                address(this)
            );
        }

        assembly {
            let result := delegatecall(gas(), implementation, add(data, 32), mload(data), 0, 0)
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