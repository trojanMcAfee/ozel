const { ethers, Wallet } = require("ethers");
const { defaultAbiCoder: abiCoder } = ethers.utils;
const axios = require('axios').default;
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');

const {
    l1ProviderTestnet,
    l2ProviderTestnet,
    network,
    ops
} = require('./state-vars.js');


const l2Wallet = new Wallet(process.env.PK, l2ProviderTestnet);

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

const storageBeaconAddr = '0xF15423Bce9704Fc6E3199c685B46C03b67AF4217'; //rinkeby
const emitterAddr = '0xBDf7Acf088814912329aC12c6895c0b9FE690c93'; 
const redeemedHashesAddr = '0xFf3DaB28E5dEf3416a68B26A022cf557499F856a'; 

const tasks = {}; 
const proxyQueue = [];

async function main() {
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);

    const filter = {
        address: emitterAddr, 
        topics: [
            ethers.utils.id("ShowTicket(address)") 
        ]
    };

    console.log('listening...');

    await hre.ethers.provider.on(filter, async (encodedData) => { 
        let codedProxy = encodedData.topics[1];
        let [ proxy ] = abiCoder.decode(['address'], codedProxy);
        if (proxyQueue.indexOf(proxy) === -1) proxyQueue.push(proxy);
        console.log('queue pre: ', proxyQueue);

        setTimeout(continueExecution, 120000);
        console.log('setTimeout rolling...');

        async function continueExecution() {
            proxy = proxyQueue.shift();
            console.log('queue post: ', proxyQueue);
            console.log('proxy removed: ', proxy);
            let taskId = await storageBeacon.getTaskID(proxy);

            if (!tasks[taskId]) {
                tasks[taskId] = {};
                tasks[taskId].alreadyCheckedHashes = [];
            }

            let result = await axios.post(URL, query(taskId));
            let executions =  result.data.data.tasks[0].taskExecutions;
            console.log('executions: ', executions);

            parent:
            for (let i=0; i < executions.length; i++) {
                let [ hash ] = executions[i].id.split(':');
                console.log('hash: ', hash);

                let notInCheckedArray = tasks[taskId].alreadyCheckedHashes.indexOf(hash) === -1;
                if (!notInCheckedArray) continue parent;

                let [ message, wasRedeemed ] = await checkHash(hash);

                wasRedeemed ? tasks[taskId].alreadyCheckedHashes.push(hash) : await redeemHash(message, hash, taskId);
            }

            //----------
            const redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);
            const redemptions = await redeemedHashes.connect(l2Wallet).getTotalRedemptions();
            console.log('redemptions: ', redemptions);
            console.log('checked hashes: ', tasks[taskId].alreadyCheckedHashes);
        }
    });
}


async function checkHash(hash) { 
    const receipt = await l1ProviderTestnet.getTransactionReceipt(hash);
    const l1Receipt = new L1TransactionReceipt(receipt);
    const message = await l1Receipt.getL1ToL2Message(l2Wallet);
    const status = (await message.waitForStatus()).status;
    const wasRedeemed = status === L1ToL2MessageStatus.REDEEMED ? true : false;

    return [
        message,
        wasRedeemed
    ];
}

async function redeemHash(message, hash, taskId) {
    let tx = await message.redeem(ops);
    await tx.wait();
    console.log(`hash: ${hash} redemeed ^^^^^`);
    tasks[taskId].alreadyCheckedHashes.push(hash);
    
    const redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);
    tx = await redeemedHashes.connect(l2Wallet).storeRedemption(taskId, hash);
    await tx.wait();

    //---------
    // const redemptions = await redeemedHashes.connect(l2Wallet).getTotalRedemptions();
    // console.log('redemptions: ', redemptions);
    // console.log('checked hashes: ', tasks[taskId].alreadyCheckedHashes);
}

function removeFromQueue() {

}


main();


module.exports = {
    checkHash,
    redeemHash
};


