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
    console.log(`^^^ Failed assertion ${n}/2 to prove that it was configured properly`);
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


async function simulateDeployment(type) {
    let storageBeaconAddr, storageBeacon;
    let emitterAddr;
    let redeemedHashesAddr, redeemedHashes;
    let newProxyAddr;

    if (type === 'manualRedeem') {
        storageBeaconAddr = '0xCB4b0EDFDA95bd2Ed2dE9F8ef8440918F55A91ef';
        redeemedHashesAddr = '0x94Fa5674Ac65c18616f760D915819a538B571b77';
        emitterAddr = '0x5b3aEae359cE1581Be337081630Fccc375bda757';
        newProxyAddr = '0x8798Ce76F4a19b87EfB10686949A47a14A883587';
    } else if ('autoRedeem') {
        storageBeaconAddr = '0x8bA82da2e57993904A4254C398e09A4AB7d388e6';
        redeemedHashesAddr = '0x233F3496e738674e4334347190cddCFB7f600F38';
        emitterAddr = '0xb4Dc0300c55df2bF66AA2B29AEb4055b9A7C2D19';
        newProxyAddr = '0x3A89c74e35c68C1FdD376B582620E375446d3909';
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
    console.log('******** START OF MANUAL REDEEM ********');
    console.log('');

    let { 
        storageBeacon, 
        emitter: emitterAddr, 
        redeemedHashes, 
        newProxy: newProxyAddr 
    } = await runSetup(1, 'manualRedeem');

    await startListening(storageBeacon, emitterAddr, redeemedHashes, true);

    //Sends ETH to the account/proxy
    await sendETHandAssert(newProxyAddr);

    console.log('');
    console.log('******** END OF MANUAL REDEEM ********');
    console.log('');
}


async function autoRedeem() {
    console.log('******** START OF AUTO REDEEM ********');
    console.log('');
    const { 
        storageBeacon, 
        emitter: emitterAddr, 
        redeemedHashes, 
        newProxy: newProxyAddr 
    } = await runSetup(2, 'autoRedeem');

    await startListening(storageBeacon, emitterAddr, redeemedHashes);

    //Sends ETH to the account/proxy
    await sendETHandAssert(newProxyAddr);
}


(async () => await manualRedeem())();
(async () => await autoRedeem())();






