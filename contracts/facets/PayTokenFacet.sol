//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import './ERC20Facet/ERC20Facet.sol';
import './ManagerFacet.sol';

// import 'hardhat/console.sol';

// import '../AppStorage.sol';


contract PayTokenFacet is ERC20Facet { 

   
    

    function balanceOf(address account) public view override returns (uint256) {
        return (s.distributionIndex * s.usersPayments[account] * 100 ) / 10 ** 8;
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        require(sender != address(0), "ERC20Facet: transfer from the zero address");
        require(recipient != address(0), "ERC20Facet: transfer to the zero address");

        _beforeTokenTransfer(sender, recipient, amount);

        uint256 senderBalance = balanceOf(sender);
        require(senderBalance >= amount, "ERC20Facet: transfer amount exceeds balance");
        (bool success, ) = address(s.manager).delegatecall(
            abi.encodeWithSignature(
                'transferUserAllocation(address,address,uint256)', 
                sender, recipient, amount
            ) 
        );
        require(success, 'PayTokenFacet: transfer override failed');

        emit Transfer(sender, recipient, amount);

        _afterTokenTransfer(sender, recipient, amount);
    } 
}