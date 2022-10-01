const { ethers } = require('ethers');
const { parseEther, formatEther } = ethers.utils;
const { deployTestnet } = require('../../scripts/begin-testnet.js');
const { startListening } = require('./event-listener-for-test.js');

const { ops, l1SignerTestnet, usdtAddrArb, defaultSlippage, factoryABI } = require('../../scripts/state-vars.js');
const { assert } = require("console");



async function sendETHandAssert(newProxyAddr) {
    const value = 0.1;
    ops.to = newProxyAddr;
    ops.value = parseEther(value.toString());

    const tx = await l1SignerTestnet.sendTransaction(ops);
    await tx.wait();

    const balance = await hre.ethers.provider.getBalance(newProxyAddr);
    assert(formatEther(balance) == value);
    console.log('ETH successfully received in proxy (pre-bridge)');
}

function assertProof() {
    assert(1 > 2); 
    console.log('^^^ Only failed assertion to prove that it was configured properly');
    console.log('');
}

//-------

async function autoRedeem() {
    assertProof();

    const [
        storageBeacon,
        emitterAddr,
        newProxyAddr,
        redeemedHashes
    ] = await deployTestnet(true);

    // const [
    //     storageBeaconAddr,
    //     emitterAddr,
    //     redeemedHashesAddr
    // ] = await simulateDeployment();

    console.log('');
    await startListening(storageBeacon, emitterAddr, redeemedHashes);

    //Sends ETH to the proxy
    await sendETHandAssert(newProxyAddr);
}


async function manualRedeem() {
    assert(1 > 2); 
    console.log('^^^ Only failed assertion to prove it was configured properly');
    console.log('');

    console.log('--------------------- Contract addresses ---------------------');
    const [
        storageBeacon,
        emitterAddr,
        newProxyAddr,
        redeemedHashes
    ] = await deployTestnet(true, true);

    // const [
    //     storageBeaconAddr,
    //     newProxyAddr,
    //     redeemedHashesAddr
    // ] = await simulateDeployment();

    console.log('');
    await startListening(storageBeacon, emitterAddr, redeemedHashes, true);

    //Sends ETH to the proxy
    await sendETHandAssert(newProxyAddr);
}

async function simulateDeployment() {
    const storageBeaconAddr = '0xF15423Bce9704Fc6E3199c685B46C03b67AF4217';
    const emitterAddr = '0xBDf7Acf088814912329aC12c6895c0b9FE690c93';
    const redeemedHashesAddr = '0xFf3DaB28E5dEf3416a68B26A022cf557499F856a';
    const proxyFactoryAddr = '0xFa2EA7C79190956B6f8F95e191533E36F68EB7d1';

    return [
        storageBeaconAddr,
        emitterAddr,
        redeemedHashesAddr,
        proxyFactoryAddr
    ];

}


(async () => await autoRedeem())();
(async () => await manualRedeem())();





