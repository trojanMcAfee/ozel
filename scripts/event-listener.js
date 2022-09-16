const { ethers, providers, Wallet } = require("ethers");
const { defaultAbiCoder: abiCoder } = ethers.utils;
const axios = require('axios').default;
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');

const {
    l1ProviderTestnet,
    l2ProviderTestnet,
    network
} = require('./state-vars.js');


// const l1Provider = new providers.JsonRpcProvider(process.env.RINKEBY);
// const l2Provider = new providers.JsonRpcProvider(process.env.ARB_TESTNET);
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

const storageBeaconAddr = '0x29ebf24cc0E8c1337fA953331e28D3572508F4CC'; //rinkeby --> manualRedeem: 0x25D8e872Efa7499BD5e063eA8C6730AEFFE767fc - good: 0x057305B668f7b1a1C4901D023c3fb844801EAb96
const proxy = '0x78ec03E47571A8B5B75a6429a4C8881B3C8B0797'; //rinkeby --> manualRedeem: 0x21352573f419Bf7c090d03c9CFB1B866086F2097 - good: 0x24c3Caf6e39885A87C4B1e726B32c80E9B6e445D
const redeemedHashesAddr = '0x7F5be070110cec511369a7879DC14cECf46b20d4'; //rinkeby --> good: 0xd7A008bE42F747281B76b5ceEADC8960Ac9df0e6
//taskId (good one): 0xc5ca4e141d2134e32ef3b779374fde598c354168ff4aa04ebf933dfd07363f21 - manualRedeem: 0xb6fd8625541b1f084582b7af4cb549cfcc712b291ea73b0699313644ed92bf14

const tasks = {}; 

async function main() {
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);

    const filter = {
        address: proxy, 
        topics: [
            ethers.utils.id("FundsToArb(address,address,uint256)") 
        ]
    };

    console.log('listening...');

    await hre.ethers.provider.on(filter, async (encodedData) => {
        let codedProxy = encodedData.topics[1];
        let [ proxy ] = abiCoder.decode(['address'], codedProxy);
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

            for (let j=0; j < tasks[taskId].alreadyCheckedHashes.length || j == 0; j++) {
                let checkedHash = 
                    !tasks[taskId].alreadyCheckedHashes[j] ? 0: tasks[taskId].alreadyCheckedHashes[j];
                
                if (hash === checkedHash) {
                    console.log('here ***');
                    if (i === executions.length - 1) console.log('tasks1: ', tasks);
                    continue parent;
                } else if (
                    j === tasks[taskId].alreadyCheckedHashes.length - 1 < 0 ?
                    0 : 
                    tasks[taskId].alreadyCheckedHashes.length - 1
                ) {
                    redeemHash(hash, taskId);
                }
            }
        }
    });
}


async function redeemHash(hash, taskId) {
    const redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);

    let receipt = await l1ProviderTestnet.getTransactionReceipt(hash);
    let l1Receipt = new L1TransactionReceipt(receipt);
    let message = await l1Receipt.getL1ToL2Message(l2Wallet);
    let status = (await message.waitForStatus()).status;

    console.log('redeemed status is: ', L1ToL2MessageStatus.REDEEMED);
    console.log(`hash: ${hash} with status: ${status}`);

    if (status === L1ToL2MessageStatus.REDEEMED) {
        console.log('already redeemed');
        if (tasks[taskId].alreadyCheckedHashes.indexOf(hash) === -1) tasks[taskId].alreadyCheckedHashes.push(hash); 
    } else {
        console.log('pending for redeemed status is ^^^: ', status);

        let tx = await message.redeem();
        await tx.wait();
        console.log('redeemed');

        tx = await redeemedHashes.connect(l2Wallet).storeRedemption(taskId, hash);
        await tx.wait();
        tasks[taskId].alreadyCheckedHashes.push(hash);
    }

    //----------
    const redemptions = await redeemedHashes.connect(l2Wallet).getTotalRedemptions();
    console.log('redemptions: ', redemptions);
    console.log('checked hashes: ', tasks[taskId].alreadyCheckedHashes);

}

// function getTasks() {
//     return tasks;
// }



main();


// module.exports = tasks;
// exports.tasks = tasks;