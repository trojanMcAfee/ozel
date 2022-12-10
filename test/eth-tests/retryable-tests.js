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


function assertProof(n) {
    assert(1 > 2); 
    console.log(`^^^ Assertion ${n}/2 to prove that it was configured properly`);
    console.log('');
    console.log('--------------------- Contract addresses ---------------------');
}


function logContracts(addresses) {
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
}

async function runSetup(assertNum, redeemType) {
    assertProof(assertNum);
    const addresses = await simulateDeployment(redeemType);
    logContracts(addresses);
    return addresses;
}


async function autoRedeem() {
    assertProof(1);

    const addresses = await simulateDeployment('manualRedeem');

    logContracts(addresses);

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


async function simulateDeployment(type) {
    let storageBeaconAddr, storageBeacon;
    let emitterAddr;
    let redeemedHashesAddr, redeemedHashes;
    let newProxyAddr;

    if (type === 'manualRedeem') {
        storageBeaconAddr = '0xDf2956dB0E0c283d2cd7eB27ecBDaBBdEe329516';
        redeemedHashesAddr = '0xBAa20c48292C4Be9319dA3E7620F4364aac498b4';
        emitterAddr = '0x45cEaeAB767265352977E136234E4A0c3d5cDC44';
        newProxyAddr = '0x858F9F673Df70DB94c49cdDD221AE2C46451C9Cc';
    } else if ('autoRedeem') {
        storageBeaconAddr = '';
        redeemedHashesAddr = '';
        emitterAddr = '';
        newProxyAddr = '';
    }

    storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);
    redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);

    return {
        storageBeacon: storageBeacon,
        emitter: emitterAddr,
        redeemedHashes: redeemedHashes,
        newProxy: newProxyAddr
    };
}



async function manualRedeem() {
    // assertProof(2);

    // const addresses = await simulateDeployment('manualRedeem');

    // logContracts(addresses);


    const { 
        storageBeacon, 
        emitter: emitterAddr, 
        redeemedHashes, 
        newProxy: newProxyAddr 
    } = await runSetup(2, 'manualRedeem');;

    console.log('');
    await startListening(storageBeacon, emitterAddr, redeemedHashes, true);

    //Sends ETH to the proxy
    await sendETHandAssert(newProxyAddr);
}


// (async () => await autoRedeem())();
(async () => await manualRedeem())();





