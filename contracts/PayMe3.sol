// //SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.0;


// import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
// import '@openzeppelin/contracts/token/ERC777/IERC777.sol';
// import '@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol';
// import "@openzeppelin/contracts/interfaces/IERC1820Registry.sol";
// import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';

// import 'hardhat/console.sol';


// contract PayMe is IERC777Recipient {

//     IERC777 pBTC;
//     IERC1820Registry erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
//     bytes32 TOKENS_RECIPIENT_INTERFACE_HASH = keccak256(abi.encodePacked('ERC777TokensRecipient'));

//     // event DepositReceived(address operator, address from, address to, uint amount, bytes userData, bytes operatorData);

//     constructor(address _token) {
//         pBTC = IERC777(_token);
//         erc1820.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
//     }


//     function getBalance() public view returns(uint) {
//         return pBTC.balanceOf(address(this));
//     }


//     function tokensReceived(
//         address operator,
//         address from,
//         address to,
//         uint256 amount,
//         bytes calldata userData,
//         bytes calldata operatorData
//     ) external override {
//         require(msg.sender == address(pBTC), "Simple777Recipient: Invalid token");


//         pBTC.send(
//             0x715358348287f44c8113439766b9433282110F6c,
//             pBTC.balanceOf(address(this)),
//             '0x0'
//         );

//         // emit DepositReceived(operator, from, to, amount, userData, operatorData);

//     }


// }