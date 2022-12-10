const { ethers, Wallet } = require("ethers");
const { defaultAbiCoder: abiCoder } = ethers.utils;
const axios = require('axios').default;
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');
const { assert } = require('console');

const {
    l1ProviderTestnet,
    l2ProviderTestnet,
    network,
    testnetReceiver,
    ops,
} = require('../../scripts/state-vars.js');


const l2Wallet = new Wallet(process.env.PK_TESTNET, l2ProviderTestnet);
const tasks = {};
const proxyQueue = [];
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


async function startListening(storageBeacon, emitterAddr, redeemedHashes, manualRedeem = false) {
    const filter = {
        address: emitterAddr, 
        topics: [
            ethers.utils.id("ShowTicket(address)") 
        ]
    };

    console.log('-------------------------- Bridging --------------------------');
    console.log('Listening for the bridge transaction from L1 to L2...');

    await hre.ethers.provider.once(filter, async (encodedData) => {
        let codedProxy = encodedData.topics[1];
        let [ proxy ] = abiCoder.decode(['address'], codedProxy);
        if (proxyQueue.indexOf(proxy) === -1) proxyQueue.push(proxy);

        //Waits to query Gelato's subgraph for the tx hashes
        setTimeout(continueExecution, 120000);
        console.log('Wait 2 minutes to query Gelato subgraph for L1 transaction hashes...');
        console.log('-------------------------- Redeem checkup --------------------------');

        async function continueExecution() {
            proxy = proxyQueue.shift();
            let taskId = await storageBeacon.getTaskID(proxy);

            //ETH has been sent out from the proxy by the Gelato call
            const balance = await hre.ethers.provider.getBalance(proxy);
            assert(Number(balance) === 0);
            console.log('ETH left L1 contract (aka account/proxy) to L2');

            if (!tasks[taskId]) {
                tasks[taskId] = {};
                tasks[taskId].alreadyCheckedHashes = [];
            }

            let result = await axios.post(URL, query(taskId));
            let executions =  result.data.data.tasks[0].taskExecutions;
            console.log('Executions: ', executions);

            parent:
            for (let i=0; i < executions.length; i++) {
                let [ hash ] = executions[i].id.split(':');
                let notInCheckedArray = tasks[taskId].alreadyCheckedHashes.indexOf(hash) === -1;
                if (!notInCheckedArray) continue parent;

                let [ message, wasRedeemed ] = await checkHash(hash);

                wasRedeemed ? tasks[taskId].alreadyCheckedHashes.push(hash) : await redeemHash(message, hash, taskId, redeemedHashes, executions);
            }

            if (!manualRedeem) {
                assert(tasks[taskId].alreadyCheckedHashes.length === executions.length);
                console.log('checked hashes: ', tasks[taskId].alreadyCheckedHashes);
            }

            setTimeout(waitingForFunds, 600000);
            console.log(`Waiting for funds in L2 (takes 10 minutes; current time: ${new Date().toTimeString()})`);

            async function waitingForFunds() { 
                const balance = await l2ProviderTestnet.getBalance(testnetReceiver);
                assert(Number(balance) > 0.05);
                console.log('Contract in L2 received the ETH');
            }
        }
    });
}


async function checkHash(hash) { 
    const receipt = await l1ProviderTestnet.getTransactionReceipt(hash);
    const l1Receipt = new L1TransactionReceipt(receipt);
    const messages = await l1Receipt.getL1ToL2Messages(l2Wallet);
    const message = messages[0];
    const messageRec = await message.waitForStatus();
    const status = messageRec.status;
    const wasRedeemed = status === L1ToL2MessageStatus.REDEEMED ? true : false;

    return [
        message,
        wasRedeemed
    ];
}

async function redeemHash(message, hash, taskId, redeemedHashes, executions) { 
    let tx = await message.redeem(ops);
    await tx.waitForRedeem();

    const [  msg, wasRedeemed ] = await checkHash(hash);

    // const status = (await message.waitForStatus()).status;

    assert(wasRedeemed);
    console.log(`hash: ${hash} redemeed`);
    tasks[taskId].alreadyCheckedHashes.push(hash);
    
    tx = await redeemedHashes.connect(l2Wallet).storeRedemption(taskId, hash);
    await tx.wait();

    const redemptions = await redeemedHashes.connect(l2Wallet).getTotalRedemptions();
    assert(executions.length === redemptions.length);
    console.log('redemptions: ', redemptions);
}






module.exports = {
    startListening
};


