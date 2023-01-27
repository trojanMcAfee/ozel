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
    /**
     * Addresses with auto-redeem = 0 which would make it fail,
     * entailing manual redeeme. 
     */
    const storageBeaconAddr = '0xFdD4010f648cc90071fFF48F016Ae69454de275F';
    const redeemedHashesAddr = '0x494C027bd5f8a6ecC7a86695A9d50f2A43602600'; 
    const emitterAddr = '0x74df65210351AE6860749E74d65a9B8aEfe1eaBB';
    const newProxyAddr = '0x6efcC2704EEE13351Ae35Ba0A336A4Db326C95A2'; 

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


