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

async function runSetup() {
    assertProof();
    const addresses = await simulateDeployment();
    logContracts(addresses);
    return addresses;
}

async function simulateDeployment() {
    const storageBeaconAddr = '0xDf2956dB0E0c283d2cd7eB27ecBDaBBdEe329516';
    const redeemedHashesAddr = '0xBAa20c48292C4Be9319dA3E7620F4364aac498b4'; //0x82ab905466713465B4b7e29afb13853225124b0c
    const emitterAddr = '0x45cEaeAB767265352977E136234E4A0c3d5cDC44';
    const newProxyAddr = '0x02A5dC16D0be5FF5FC2Ed264cbF66002303C6387'; 

    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);
    const redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);

    return {
        storageBeacon: storageBeacon,
        emitter: emitterAddr,
        redeemedHashes: redeemedHashes,
        newProxy: newProxyAddr
    };
}

/*///////////////////////////////////////////////////////////////
                        Main function
//////////////////////////////////////////////////////////////*/

async function manualRedeem() {
    console.log('******** START OF MANUAL REDEEM ********');
    console.log('');

    const { 
        storageBeacon, 
        emitter: emitterAddr, 
        redeemedHashes, 
        newProxy: newProxyAddr 
    } = await runSetup();

    await startListening(storageBeacon, emitterAddr, redeemedHashes);

    //Sends ETH to the account/proxy
    await sendETHandAssert(newProxyAddr);
}


(async () => await manualRedeem())();


