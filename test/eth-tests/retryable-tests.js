const { ethers } = require('ethers');
const { parseEther, formatEther } = ethers.utils;
const { startListening } = require('./listener-test/event-listener.js');
const { ops, l1SignerTestnet } = require('../../scripts/state-vars.js');
const { assert } = require("console");


/*///////////////////////////////////////////////////////////////
                          Helpers
//////////////////////////////////////////////////////////////*/

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
    console.log(`^^^ Only failed assertion to prove that it was configured properly`);
    console.log('');
    console.log('--------------------- Contracts addresses ---------------------');
}

function logContracts(addresses) { 
    for (let prop in addresses) {
        addr = addresses[prop];
        console.log(`${prop}: ${addr}`);
    }
}

async function runSetup() {
    assertProof();
    const addresses = await simulateDeployment();
    logContracts(addresses);
    return addresses;
}

async function simulateDeployment() {
    const storageBeaconAddr = '0x923F1A77B9F860E622492042edb840980B868Fe0';
    const redeemedHashesAddr = '0xEbd24110595AEaAE06CD419eBBe0D4b7aAa5611b'; 
    const emitterAddr = '0x23916341eC5d94f8719A7c79e0E778D1221daEFa';
    const newProxyAddr = '0x85CAE8197d6dF67881764c6EeA55e664E6738235'; 

    return {
        StorageBeacon: storageBeaconAddr,
        Emitter: emitterAddr,
        RedeemedHashes: redeemedHashesAddr,
        Account: newProxyAddr
    };
}

/*///////////////////////////////////////////////////////////////
                        Main function
//////////////////////////////////////////////////////////////*/

async function manualRedeem() {
    console.log('******** START OF MANUAL REDEEM TEST ********');
    console.log('');

    const {
        StorageBeacon: storageBeaconAddr, 
        Emitter: emitterAddr, 
        RedeemedHashes: redeemedHashesAddr, 
        Account: newProxyAddr 
     } = await runSetup();

    await startListening(storageBeaconAddr, emitterAddr, redeemedHashesAddr);

    //Sends ETH to the account/proxy
    await sendETHandAssert(newProxyAddr);
}


(async () => await manualRedeem())();


