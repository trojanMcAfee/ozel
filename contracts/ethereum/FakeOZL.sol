// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14;


import '@openzeppelin/contracts/access/Ownable.sol';
import './StorageBeacon.sol';


contract FakeOZL is Ownable {

    address user;
    address public receiver;
    address immutable deadAddr = 0x000000000000000000000000000000000000dEaD;
    address immutable nullAddr = 0x0000000000000000000000000000000000000000;

    struct FakeOZLVars { 
        uint totalVolumeInUSD;
        uint totalVolumeInETH;
        uint wethUM;
        uint valueUM;
        uint ozlBalance;
        uint wethUserShare;
        uint usdUserShare;
    }

    FakeOZLVars vars;

    mapping(address => mapping(address => uint)) userBalances;

    constructor(address receiver_, FakeOZLVars memory vars_) {
        receiver = receiver_;
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
        return userBalances[user_][user_];
    }

    function getOzelBalances(address user_) external view returns(uint, uint) {
        uint wethUserShare = userBalances[user_][deadAddr];
        uint usdUserShare = userBalances[user_][nullAddr];
        return (wethUserShare, usdUserShare);
    }

    //----------

    function exchangeToUserToken(StorageBeacon.UserConfig memory userDetails_) external payable {
        if (address(this).balance > 0) {
            (bool success, ) = receiver.call{value: address(this).balance}(""); 
            require(success, 'ETH sent failed');
        }
        user = userDetails_.user;
    }

    function changeFakeOZLVars(FakeOZLVars memory newVars_) external onlyOwner {
        vars = newVars_;
        userBalances[msg.sender][msg.sender] = newVars_.ozlBalance;
        userBalances[msg.sender][deadAddr] = newVars_.wethUserShare;
        userBalances[msg.sender][nullAddr] = newVars_.usdUserShare;
    } 

    function changeReceiver(address newReceiver_) external onlyOwner {
        receiver = newReceiver_;
    }
}