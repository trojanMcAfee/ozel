// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol';
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import '@rari-capital/solmate/src/utils/ReentrancyGuard.sol';
import './ozUpgradeableBeacon.sol';
import './StorageBeacon.sol';

// import 'hardhat/console.sol';



contract ozBeaconProxy is ReentrancyGuard, Initializable, BeaconProxy { 

    StorageBeacon.UserConfig userDetails;
    StorageBeacon.FixedConfig fxConfig;

    address private beacon; 

    event FundsToArb(address indexed proxy, address indexed sender, uint amount);
    
    constructor(
        address beacon_,
        bytes memory data_
    ) BeaconProxy(beacon_, data_) {}                                    


    receive() external payable override {}


    function _getStorageBeacon() private view returns(StorageBeacon) {
        return StorageBeacon(ozUpgradeableBeacon(_beacon()).storageBeacon(0));
    }


    function checker() external view returns(bool canExec, bytes memory execPayload) {
        if (address(this).balance > 0) {
            canExec = true;
        }
        execPayload = abi.encodeWithSignature('sendToArb()');
    }

  
    function _delegate(address implementation) internal override { 
        bytes memory data; 
        StorageBeacon storageBeacon = _getStorageBeacon();

        if ( storageBeacon.isSelectorAuthorized(bytes4(msg.data)) ) { 
            data = msg.data;
        } else {
            data = abi.encodeWithSignature(
                'sendToArb(uint256,(address,address,uint256,string))', 
                storageBeacon.getGasPriceBid(),
                userDetails
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






