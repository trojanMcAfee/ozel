// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.14;


import '@openzeppelin/contracts/access/Ownable.sol';
import '../libraries/LibCommon.sol';
import './StorageBeacon.sol';


/**
 * @title Dummy OZLFacet to simulate the one deployed in L2
 * @notice Replicates the main view functions for testing the UI and 
 * and the reception of ETH in L2.
 */
contract FakeOZL is Ownable {

    address user;
    bytes public deadData;
    address immutable deadAddr = 0x000000000000000000000000000000000000dEaD;
    address immutable nullAddr = 0x0000000000000000000000000000000000000000;
    
    event DeadVariable(address user);

    struct FakeOZLVars { 
        uint totalVolumeInUSD;
        uint totalVolumeInETH;
        uint wethUM;
        uint valueUM;
        uint ozlBalance;
        uint wethUserShare;
        uint usdUserShare;
    }

    struct AccountConfig {
        address user;
        address token;
        uint slippage; 
        string name;
    }

    FakeOZLVars vars;

    mapping(address => mapping(address => uint)) userBalances;
    mapping(address => uint) accountPayments;

    constructor(FakeOZLVars memory vars_) {
        user = msg.sender;
        vars = FakeOZLVars({
            totalVolumeInUSD: vars_.totalVolumeInUSD,
            totalVolumeInETH: vars_.totalVolumeInETH,
            wethUM: vars_.wethUM,
            valueUM: vars_.valueUM,
            ozlBalance: vars_.ozlBalance,
            wethUserShare: vars_.wethUserShare,
            usdUserShare: vars_.usdUserShare
        });

        userBalances[msg.sender][msg.sender] = vars_.ozlBalance;
        userBalances[msg.sender][deadAddr] = vars_.wethUserShare;
        userBalances[msg.sender][nullAddr] = vars_.usdUserShare;
    }

    receive() external payable {}

    /*///////////////////////////////////////////////////////////////
                    ozLoupeFacet's dummy methods
    //////////////////////////////////////////////////////////////*/

    function getTotalVolumeInUSD() external view returns(uint) {
        return vars.totalVolumeInUSD;
    }

    function getTotalVolumeInETH() external view returns(uint) {
        return vars.totalVolumeInETH;
    }

    function getAUM() external view returns(uint, uint) {
        return (vars.wethUM, vars.valueUM);
    }

    function balanceOf(address user_) external view returns(uint) {
        return userBalances[user_][user_] == 0 ? userBalances[user][user] : 0;
    }

    function getOzelBalances(address user_) external view returns(uint, uint) {
        if (userBalances[user_][user_] == 0) {
            uint wethUserShare = userBalances[user][deadAddr];
            uint usdUserShare = userBalances[user][nullAddr];
            return (wethUserShare, usdUserShare);
        } else {
            return (0,0);
        }
    }

    /*///////////////////////////////////////////////////////////////
                              Helpers 
    //////////////////////////////////////////////////////////////*/

    function changeFakeOZLVars(FakeOZLVars memory newVars_) external onlyOwner {
        vars = newVars_;
        userBalances[msg.sender][msg.sender] = newVars_.ozlBalance;
        userBalances[msg.sender][deadAddr] = newVars_.wethUserShare;
        userBalances[msg.sender][nullAddr] = newVars_.usdUserShare;
    } 

    /*///////////////////////////////////////////////////////////////
                    OZLFacet's main dummy method
    //////////////////////////////////////////////////////////////*/

    function exchangeToAccountToken(
        bytes memory dataForL2_,
        uint amountToSend_,
        address account_
    ) external payable {
        deadData = dataForL2_;
        accountPayments[account_] += amountToSend_;
        (address user2,,) = getDetails();

        if (address(this).balance > 0) {
            (bool success, ) = payable(user2).call{value: address(this).balance}(""); 
            require(success, 'ETH sent failed');
        }
    }

    function getDetails() public view returns(address, address, uint16) {
        (address user2, address token, uint16 slippage) = LibCommon.extract(deadData);
        return (user2, token, slippage);
    }

    function getAccountPayments(address account_) external view returns(uint) {
        return accountPayments[account_];
    }
}