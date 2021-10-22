//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;


import './Manager.sol'; 
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './interfaces/IGatewayRegistry.sol';
import './interfaces/IGateway.sol';




contract PayMe {

    IGatewayRegistry registry;
    Manager manager; 
    IERC20 renBTC; 

    constructor(address _registry, address _manager, address _renBTC) {
        registry = IGatewayRegistry(_registry);
        manager = Manager(_manager);
        renBTC = IERC20(_renBTC);
    }


    function deposit(
        bytes calldata _user, 
        bytes calldata _userToken,
        uint _amount,
        bytes32 _nHash,
        bytes calldata _sig
    ) external {
        bytes32 pHash = keccak256(abi.encode(_user, _userToken));
        IGateway BTCGateway = registry.getGatewayBySymbol('BTC');
        BTCGateway.mint(pHash, _amount, _nHash, _sig);

        address user = manager._bytesToAddress(_user);
        address userToken = manager._bytesToAddress(_userToken);
        transferToManager(address(manager), user, userToken);
    }

    receive() external payable {} 

    function transferToManager(
        address _manager, 
        address _user, 
        address _userToken
    ) public {
        uint amount = renBTC.balanceOf(address(this));
        renBTC.transfer(_manager, amount);
        manager.exchangeToUserToken(amount, _user, _userToken);
    }
 
} 


