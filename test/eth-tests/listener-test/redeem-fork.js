const { ethers, Wallet } = require("ethers");
const axios = require('axios').default;
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');
const { assert } = require("console");
const { parseEther } = require("ethers/lib/utils.js");
// const { sBeaconABI, redeemABI } = require('./abis.json');

const {
  l1ProviderTestnet,
  network,
  opsL2_2,
  l2ProviderTestnet,
  testnetReceiver,
  myReceiver
} = require('../../../scripts/state-vars.js');

const privateKey = process.env.PK_TESTNET; //<---- replace this for a hard-coded private key
const l2Wallet = new Wallet(privateKey, l2ProviderTestnet);
const tasks = {}; 
let storageBeacon, redeemedHashes;
const URL = `https://api.thegraph.com/subgraphs/name/gelatodigital/poke-me-${network}`;
const query = (taskId) => {
    return {
        query: `
            {
                tasks(where: {id: "${taskId}"}) {
                    id
                    taskExecutions {
                        id,
                        success
                    }
                }
            }
        `
    }
};


async function sendToRedeemFork(sBeacon, rHashes) {
    storageBeacon = sBeacon;
    redeemedHashes = rHashes;
}



process.on('message', async (msg) => {

    let { proxy } = msg;
    let taskId = await storageBeacon.getTaskID(proxy);

    //ETH has been sent out from the account/proxy by the Gelato call
    const balance = await hre.ethers.provider.getBalance(proxy);
    assert(Number(balance) === 0);
    console.log('ETH left L1 contract (aka account/proxy) to L2');

    if (!tasks[taskId]) {
        tasks[taskId] = {};
        tasks[taskId].alreadyCheckedHashes = [];
    }

    let result = await axios.post(URL, query(taskId));
    let executions = result.data.data.tasks[0].taskExecutions.filter(exec => exec.success === true);

    parent:
    for (let i=0; i < executions.length; i++) {
        let [ hash ] = executions[i].id.split(':');

        let notInCheckedArray = tasks[taskId].alreadyCheckedHashes.indexOf(hash) === -1;
        if (!notInCheckedArray) continue parent;

        let [ message, wasRedeemed ] = await checkHash(hash);

        wasRedeemed ? tasks[taskId].alreadyCheckedHashes.push(hash) : await redeemHash(message, hash, taskId);
    }

    assert(tasks[taskId].alreadyCheckedHashes.length === executions.length);
    console.log('checked hashes: ', tasks[taskId].alreadyCheckedHashes);

    setTimeout(waitingForFunds, 600000);
    console.log(`Waiting for funds on L2 (takes ~10 minutes; current time: ${new Date().toTimeString()})`);

    async function waitingForFunds() { 
        const balance = await l2ProviderTestnet.getBalance(testnetReceiver);
        console.log('L2 balance: ', Number(balance));
        assert(Number(balance) > 0.05);
        console.log('Contract in L2 received the ETH');

        opsL2_2.to = myReceiver;
        opsL2_2.value = parseEther(balance);
        const tx = await l2Wallet.sendTransaction(opsL2_2);
        await tx.wait();
    }

    process.send(true);
});


async function checkHash(hash) { 
    console.log('');
    console.log(`Checking tx: ${hash}`);
    const receipt = await l1ProviderTestnet.getTransactionReceipt(hash);
    const l1Receipt = new L1TransactionReceipt(receipt);
    const messages = await l1Receipt.getL1ToL2Messages(l2Wallet);
    const message = messages[0];
    console.log('Waiting for the status of the message from Goerli...');
    const messageRec = await message.waitForStatus();
    const status = messageRec.status;
    let wasRedeemed;

    if (status === L1ToL2MessageStatus.REDEEMED) {
        wasRedeemed = true;
        console.log('Hash already redeemed');
    } else {
        wasRedeemed = false;
    }

    return [
        message,
        wasRedeemed
    ];
}

async function redeemHash(message, hash, taskId, redeemedHashes) {
    console.log('redeeming...');
    try {
    let tx = await message.redeem(opsL2_2);
    await tx.waitForRedeem();

    console.log(`**** Hash: ${hash} redemeed ****`);
    tasks[taskId].alreadyCheckedHashes.push(hash);

    tx = await redeemedHashes.connect(l2Wallet).storeRedemption(taskId, hash, opsL2_2);
    await tx.wait();

    const redemptions = await redeemedHashes.connect(l2Wallet).getTotalRedemptions();
    assert(redemptions.length > 0);
    } catch {}
}



module.exports = {
    sendToRedeemFork
};

