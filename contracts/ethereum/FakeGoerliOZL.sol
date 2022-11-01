// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14;


import '@openzeppelin/contracts/access/Ownable.sol';
import './StorageBeacon.sol';


contract FakeGoerliOZL is Ownable {

    address user;
    address receiver;

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
        return vars.ozlBalance;
    }

    function getOzelBalances(
        address user_
    ) external view returns(uint wethUserShare, uint usdUserShare) {
        return (vars.wethUserShare, vars.usdUserShare);
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
    } 

    function changeReceiver(address newReceiver_) external onlyOwner {
        receiver = newReceiver_;
    }
}