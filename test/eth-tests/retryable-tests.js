const { ethers, Wallet } = require('ethers');
const { parseEther, formatEther } = ethers.utils;
const { startListening } = require('./listener-test/event-listener.js');
const { 
    ops, 
    l1SignerTestnet, 
    l2ProviderTestnet, 
    l1ProviderTestnet 
} = require('../../scripts/state-vars.js');
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
    const newProxyAddr = '0x3CfdA4B2b1E6160aA370bf51D2F3B3Ad7510655c'; 

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
    const l1Wallet = new Wallet(privateKey, l1ProviderTestnet);
    const l2WalletReceiver = new Wallet(pkReceiver, l2ProviderTestnet);

    const balanceSignerTestL1 = await l1Wallet.getBalance();
    const balanceOtherAccL2 = await l2WalletReceiver.getBalance();

    if (formatEther(balanceSignerTestL1) < 0.5) {
        if (formatEther(balanceOtherAccL2) < 0.03) {
            console.log('For running this test, at least address 1 must have 0.5 ETH in Goerli and address 2 0.03 ETH in Arbitrum-Goerli. Add some.');
            console.log(`address 1 - current ${formatEther(await l1Wallet.getBalance())} ETH: `, await l1Wallet.getAddress());
            console.log(`address 2 - current ${formatEther(await l2WalletReceiver.getBalance())} ETH: `, await l2WalletReceiver.getAddress());
            return;
        }
        console.log('For running this test, address 1 must have 0.5 ETH in Goerli at least. Add some.');
        console.log(`address 1 - current ${formatEther(await l1Wallet.getBalance())} ETH: `, await l1Wallet.getAddress());
        return;
    } else if (formatEther(balanceOtherAccL2) < 0.03) {
        console.log('For running this test, address 2 must have 0.03 ETH in Arbitrum-Goerli at least. Add some.');
        console.log(`address 2 - current ${formatEther(await l2WalletReceiver.getBalance())} ETH: `, await l2WalletReceiver.getAddress());
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


