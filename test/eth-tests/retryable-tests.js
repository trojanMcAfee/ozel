const { ethers } = require('ethers');
const { parseEther, formatEther } = ethers.utils;
const { startListening } = require('./event-listener-for-test.js');
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

async function runSetup() {
    assertProof();
    const addresses = await simulateDeployment();
    logContracts(addresses);
    return addresses;
}

async function simulateDeployment() {
    const storageBeaconAddr = '0xCB4b0EDFDA95bd2Ed2dE9F8ef8440918F55A91ef';
    const redeemedHashesAddr = '0x94Fa5674Ac65c18616f760D915819a538B571b77';
    const emitterAddr = '0x5b3aEae359cE1581Be337081630Fccc375bda757';
    const newProxyAddr = '0x8798Ce76F4a19b87EfB10686949A47a14A883587'; 

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

    let { 
        storageBeacon, 
        emitter: emitterAddr, 
        redeemedHashes, 
        newProxy: newProxyAddr 
    } = await runSetup();

    await startListening(storageBeacon, emitterAddr, redeemedHashes, true);

    //Sends ETH to the account/proxy
    await sendETHandAssert(newProxyAddr);
}


(async () => await manualRedeem())();






