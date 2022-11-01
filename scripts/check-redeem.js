const { ethers, Wallet } = require("ethers");
const axios = require('axios').default;
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');

const {
    l1ProviderTestnet,
    l2ProviderTestnet,
    network,
    signerTestnet,
    ops,
    pokeMeOpsAddr,
    gelatoAddr,
    ETH
} = require('./state-vars.js');




async function checkHash() { 
    const hash = '0x0d83f33fa63e4872917baa21739deb563d33a2c75038c90bac7dd39a65a14a08';
    const l2Wallet = new Wallet(process.env.PK, l2ProviderTestnet);

    const receipt = await l1ProviderTestnet.getTransactionReceipt(hash);
    const l1Receipt = new L1TransactionReceipt(receipt);
    const message = await l1Receipt.getL1ToL2Message(l2Wallet);
    const status = (await message.waitForStatus()).status;
    const wasRedeemed = status === L1ToL2MessageStatus.REDEEMED ? true : false;
    console.log('was2: ', wasRedeemed);

    // return [
    //     message,
    //     wasRedeemed
    // ];
}

checkHash();