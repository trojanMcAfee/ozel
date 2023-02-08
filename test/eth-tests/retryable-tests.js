const { ethers, Wallet } = require('ethers');
const { parseEther, formatEther } = ethers.utils;
const { startListening } = require('./listener-test/event-listener.js');
const { ops, l1SignerTestnet, l2ProviderTestnet } = require('../../scripts/state-vars.js');
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
    const storageBeaconAddr = '0x5B2380C2a61F24de00fC9BCd5F83cA9F69Ad021b';
    const redeemedHashesAddr = '0xCAACF638aAe6aa100805AA80c3d6755aD1E83196'; 
    const emitterAddr = '0x532deA73312b1435686B2469A230CbE8cCA617E6';
    const newProxyAddr = '0xbd30801d44C3D2241b7bAB57AbbAfdF1345E0ACA'; 

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
    const privateKey = process.env.PK_TESTNET; 
    const pkReceiver = process.env.PK;
    const l2Wallet = new Wallet(privateKey, l2ProviderTestnet);
    const l2WalletReceiver = new Wallet(pkReceiver, l2ProviderTestnet);

    const balance = await l2Wallet.getBalance();
    const balanceReceiver = await l2WalletReceiver.getBalance();

    if (formatEther(balance) < 0.02) {
        if (formatEther(balanceReceiver) < 0.02) {
            console.log('For running this test, these two addresses must have at least 0.05 ETH each. Add some in Arbitrum');
            console.log('address 1: ', await l2Wallet.getAddress());
            console.log('address 2: ', await l2WalletReceiver.getAddress());
            return;
        }
        console.log('For running this test, this address must have at least 0.05 ETH. Add some in Arbitrum');
        console.log('address: ', await l2Wallet.getAddress());
        return;
    } else if (formatEther(balanceReceiver) < 0.02) {
        console.log('For running this test, this address must have at least 0.05 ETH. Add some in Arbitrum');
        console.log('address: ', await l2WalletReceiver.getAddress());
        return;
    }

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


