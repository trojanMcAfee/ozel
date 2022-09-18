const { ethers, Wallet } = require("ethers");
const axios = require('axios').default;
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');

const {
    l1ProviderTestnet,
    l2ProviderTestnet,
    network
} = require('./state-vars.js');

async function queryRedeemedContract() {
    const taskId = '0x294a598f7d2e4bdb314414316cb462a7a00604070ef30d8f0c890a15f47ab4d7';
    const redeemedHashesAddr = '0x756bA4FF2914Df0ad724D6f0Cf2a4a6c03067E71';
    const redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);

    const total = await redeemedHashes.getTotalRedemptions();
    console.log('total redemptions: ', total);

    // const hash = '0x4450487edc3bdeb2cbc976343f474c3978cf4e60adca4f99b1be3d51247cfe5c';
    // const redeemed = await redeemedHashes.wasRedeemed(taskId, hash);
    // console.log('was redemeed: ', redeemed);

    const redeemsPerTask = await redeemedHashes.getRedeemsPerTask(taskId);
    console.log('per task: ', redeemsPerTask); 
}

queryRedeemedContract();


async function main() {
    const Redeem = await hre.ethers.getContractFactory('RedeemedHashes');
    const redeem = await Redeem.deploy();
    await redeem.deployed();
    console.log('redeem deployed to: ', redeem.address);

    const hash = '0xfb0b38a68a3b331c28b0045df952bd1a7fbaa29d4284e185e440180f3941b7af';
    const taskId = '0xb6fd8625541b1f084582b7af4cb549cfcc712b291ea73b0699313644ed92bf14';
    await redeem.storeRedemption(taskId, hash);

    const is = await redeem.wasRedeemed(taskId, hash);
    console.log('should be true *****: ', is);

}

// main();


async function checkTicketStatus() {
    const hash = '0xcf3019f063eeb49c471e39f125e030134e7a1dc9e7e6c131d3bc17031258c711';
    const l2Wallet = new Wallet(process.env.PK, l2ProviderTestnet);

    let receipt = await l1ProviderTestnet.getTransactionReceipt(hash);
    let l1Receipt = new L1TransactionReceipt(receipt);
    let message = await l1Receipt.getL1ToL2Message(l2Wallet);
    let status = (await message.waitForStatus()).status;

    console.log('status: ', status);
}

// checkTicketStatus();



