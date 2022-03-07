//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import '../interfaces/IL1_ETH_Bridge.sol';
import './OpsReady.sol';

import './test2.sol';

import 'hardhat/console.sol';




contract PayMeFacetHop is OpsReady { 
    address test;

    IL1_ETH_Bridge hop; 

    uint chainId; 

    address public constant nullAddr = 0x0000000000000000000000000000000000000000;
    address public immutable owner;
    address public immutable manager;

    constructor(
        address _owner, 
        address _opsGel,
        uint _chainId,
        address _hop,
        address _manager,
        address _test
    ) OpsReady(_opsGel) {
        owner = _owner;
        chainId = _chainId;
        hop = IL1_ETH_Bridge(_hop);
        manager = _manager;

        test = _test;
    }

    receive() external payable {}


    // *** HOP PART ***** 

    // function sendToArb() external onlyOps { <--------- REAL ONE
    //     hop.sendToL2{value: address(this).balance}(
    //         chainId, manager, address(this).balance, 0, 0, nullAddr, 0
    //     );
    // }

    function sendToArb(address _userToken) external payable { // <----- FOR TESTING 
        hop.sendToL2{value: msg.value}( 
            chainId, manager, msg.value, 0, 0, nullAddr, 0
        );
        (bool success, ) = test.call(
            abi.encodeWithSignature(
                'exchangeToUserToken(uint,address,address)',
                msg.value, owner, _userToken
            )
        );
        require(success, 'PaymeHopFacet: sending to Arbitrum failed');
    }

    // *** GELATO PART ******

    function startTask(address _userToken) external returns(bytes32 taskId) {
        (taskId) = opsGel.createTaskNoPrepayment(
            address(this),
            this.sendToArb.selector,
            address(this),
            abi.encodeWithSelector(this.checker.selector, _userToken),
            ETH
        );
    }

    function checker(address _userToken) external view returns(bool canExec, bytes memory execPayload) {
        if (address(this).balance > 0) {
            canExec = true;
        }
        execPayload = abi.encodeWithSelector(this.sendToArb.selector, _userToken);
    }

}



