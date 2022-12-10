const { ethers } = require('ethers');
const { parseEther, formatEther } = ethers.utils;
const { deployTestnet } = require('../../scripts/begin-testnet.js');
const { startListening } = require('./event-listener-for-test.js');

const { ops, l1SignerTestnet } = require('../../scripts/state-vars.js');
const { assert } = require("console");



async function sendETHandAssert(newProxyAddr) {
    const value = 0.1;
    ops.to = newProxyAddr;
    ops.value = parseEther(value.toString());

    const tx = await l1SignerTestnet.sendTransaction(ops);
    await tx.wait();

    const balance = await hre.ethers.provider.getBalance(newProxyAddr);
    assert(formatEther(balance) == value);
    console.log('ETH successfully received in account/proxy (pre-bridge)');
}

function assertProof() {
    assert(1 > 2); 
    console.log('^^^ Only failed assertion to prove that it was configured properly');
    console.log('');
}

async function autoRedeem() {
    assertProof();

    const [
        storageBeacon,
        emitterAddr,
        newProxyAddr,
        redeemedHashes
    ] = await deployTestnet(true);

    // const [
    //     storageBeacon,
    //     emitterAddr,
    //     newProxyAddr,
    //     redeemedHashes
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

    // const [
    //     storageBeacon,
    //     emitterAddr,
    //     redeemedHashes,
    //     newProxyAddr
    // ] = await simulateDeployment('manualRedeem');

    const addresses = await simulateDeployment('manualRedeem');

    for (let prop in addresses) {
        let addr;
        switch(prop) {
            case 'storageBeacon':
            case 'redeemedHashes':
                addr = addresses[prop].address;
                break;
            default:
                addr = addresses[prop];
        }
        console.log(`${prop}: ${addr}`);
    }

    const { 
        storageBeacon, 
        emitter: emitterAddr, 
        redeemedHashes, 
        newProxy: newProxyAddr 
    } = addresses;

    console.log('');
    await startListening(storageBeacon, emitterAddr, redeemedHashes, true);

    //Sends ETH to the proxy
    await sendETHandAssert(newProxyAddr);
}

async function simulateDeployment(type) {
    let storageBeaconAddr, storageBeacon;
    let emitterAddr;
    let redeemedHashesAddr, redeemedHashes;
    let newProxyAddr;

    if (type === 'manualRedeem') {
        storageBeaconAddr = '0xDf2956dB0E0c283d2cd7eB27ecBDaBBdEe329516';
        storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);

        redeemedHashesAddr = '0xBAa20c48292C4Be9319dA3E7620F4364aac498b4';
        redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);

        emitterAddr = '0x45cEaeAB767265352977E136234E4A0c3d5cDC44';
        newProxyAddr = '0x858F9F673Df70DB94c49cdDD221AE2C46451C9Cc';
    } else if ('auto') {

    }

    return {
        storageBeacon: storageBeacon,
        emitter: emitterAddr,
        redeemedHashes: redeemedHashes,
        newProxy: newProxyAddr
    };

    // return [
    //     storageBeacon,
    //     emitterAddr,
    //     redeemedHashes,
    //     newProxyAddr
    // ];
}


// (async () => await autoRedeem())();
(async () => await manualRedeem())();





