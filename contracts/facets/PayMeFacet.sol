//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import './ManagerFacet.sol'; 
import './ERC20Facet/IERC20Facet.sol';
import '../interfaces/IGatewayRegistry.sol';
import '../interfaces/IGateway.sol';

import '../AppStorage.sol';


import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract PayMeFacet {
    AppStorage internal s;


    function deposit(
        bytes calldata _user, 
        bytes calldata _userToken,
        uint _amount,
        bytes32 _nHash,
        bytes calldata _sig
    ) external {
        bytes32 pHash = keccak256(abi.encode(_user, _userToken));
        IGateway BTCGateway = s.registry.getGatewayBySymbol('BTC');
        BTCGateway.mint(pHash, _amount, _nHash, _sig);

        address user = s.manager._bytesToAddress(_user);
        address userToken = s.manager._bytesToAddress(_userToken);
        transferToManager(address(s.manager), user, userToken);
    }

    receive() external payable {} 

    function transferToManager(
        address _manager, 
        address _user, 
        address _userToken
    ) public {
        uint amount = s.renBTC.balanceOf(address(s.payme));
        // console.log('payme: renBTC balance - ', amount);
        // console.log('msg.sender: ', msg.sender);
        // (bool success, ) = address(s.renBTC).call(
        //     abi.encodeWithSignature(
        //         'approve(address,uint256)', 
        //         address(this), amount 
        //     )
        // );
        // require(success, 'approve failed');

        // s.renBTC.approve(msg.sender, amount);
        // uint x = s.renBTC.allowance(address(s.payme), address(this));
        // console.log('allowance2: ', x);
        
        
        // s.renBTC.transferFrom(address(s.payme), _manager, amount);
        (bool success, ) = address(s.renBTC).delegatecall(
            abi.encodeWithSignature(
                'transfer(address,uint256)', 
                _manager, amount 
            )
        );
        require(success, 'PayMeFacet: renBTC transfer to Manager failed');
        console.log(7);
        s.manager.exchangeToUserToken(amount, _user, _userToken);
    }
 
} 


