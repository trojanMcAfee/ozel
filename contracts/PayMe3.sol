//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;


// interface Vault {
//     function _bytesToAddress(bytes memory bys) external pure returns (address addr);
//     function exchangeToUserToken(uint _amount, address _user, address _userToken, address _payme) external;
    // function _sendsFeeToVault(uint _amount, address _payme) external returns(uint, bool);
// }

import './Vault.sol';

// interface MyIERC20 {
//     function approve(address spender, uint256 amount) external returns (bool);
//     function balanceOf(address account) external view returns (uint256);
//     function transfer(address recipient, uint256 amount) external returns (bool);
//     function transferFrom(
//         address sender,
//         address recipient,
//         uint256 amount
//     ) external returns (bool);
//     function allowance(address owner, address spender) external view returns (uint256);
// }

interface IGateway {
    function mint(bytes32 _pHash, uint256 _amount, bytes32 _nHash, bytes calldata _sig) external returns (uint256);
    function burn(bytes calldata _to, uint256 _amount) external returns (uint256);
}

interface IGatewayRegistry {
    function getGatewayBySymbol(string calldata _tokenSymbol) external view returns (IGateway);
    function getTokenBySymbol(string calldata _tokenSymbol) external view returns (MyIERC20);
}

import 'hardhat/console.sol';

contract PayMe3 {

    IGatewayRegistry registry;
    Vault vault; 
    MyIERC20 renBTC = MyIERC20(0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D); 

    constructor(address _registry, address _vault) {
        registry = IGatewayRegistry(_registry);
        vault = Vault(_vault);
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

        address user = vault._bytesToAddress(_user);
        address userToken = vault._bytesToAddress(_userToken);

        transferToManager(address(vault), user, userToken, address(this));
        
        // uint amount = renBTC.balanceOf(address(this));
        // renBTC.transfer(address(vault), amount);
    
        // renBTC.approve(address(vault), type(uint).max);
        // vault.exchangeToUserToken(_amount, user, userToken, address(this));
    }

    receive() external payable {} 

    function transferToManager(
        address _vault, 
        address _user, 
        address _userToken, 
        address _payme
    ) public {
        uint amount = renBTC.balanceOf(address(this));
        renBTC.transfer(_vault, amount);
        (bool success, ) = _vault.call(
            abi.encodeWithSignature(
                'exchangeToUserToken(uint256,address,address,address)',
                amount, _user, _userToken, _payme
            )
        );
        require(success, 'Transfer of renBTC to Manager failed');
    }
 
} 


