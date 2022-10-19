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
    const hash = '0x97de7dfc2c9594017b10009246f70fb59128e0bbe62c3c684f7cfe9cab655f66';
    const l2Wallet = new Wallet(process.env.PK, l2ProviderTestnet);

    console.log(1);
    const receipt = await l1ProviderTestnet.getTransactionReceipt(hash);
    console.log(2);
    const l1Receipt = new L1TransactionReceipt(receipt);
    console.log(3);
    const message = await l1Receipt.getL1ToL2Message(l2Wallet);
    console.log(4);
    const status = (await message.waitForStatus()).status;
    console.log(5);
    const wasRedeemed = status === L1ToL2MessageStatus.REDEEMED ? true : false;
    console.log('was: ', wasRedeemed);

    // return [
    //     message,
    //     wasRedeemed
    // ];
}

checkHash();