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

/***** RINKEBY *****
 * -- storageBeaconAddr --
 * Good: 0x057305B668f7b1a1C4901D023c3fb844801EAb96
 * ManualRedeem: 0x25D8e872Efa7499BD5e063eA8C6730AEFFE767fc
 * 
 * -- proxy --
 * Good: 0x24c3Caf6e39885A87C4B1e726B32c80E9B6e445D
 * ManualRedeem: 0x21352573f419Bf7c090d03c9CFB1B866086F2097
 * 
 * -- redeemedHashesAddr --
 * Good: 0xd7A008bE42F747281B76b5ceEADC8960Ac9df0e6
 * 
 * ***** GOERLI ******
 * -- storageBeaconAddr --
 * Good:
 * ManualRedeem (for Gelato): 0x29ebf24cc0E8c1337fA953331e28D3572508F4CC
 * ManualRedeem2: 0x3468Eb72D0216A3160fdB53ca4D79Bf0B9fD2f5C
 * 
 * -- proxy --
 * Good:
 * ManualRedeem (for Gelato): 0x78ec03E47571A8B5B75a6429a4C8881B3C8B0797
 * ManualRedeem2: 0x8751064bc5851630c4ebabbf2F1c7F424E322314
 * 
 * -- redeemedHashesAddr --
 * ManualRedeem: 0x7F5be070110cec511369a7879DC14cECf46b20d4
 * ManualRedeem2: 0x846D5bb895CBE573d674F426Cff278D9881456AD
 */

const storageBeaconAddr = '0x8d111Dd9F9719EBfFed62A92edE70f8d6c3321fB'; //rinkeby
const proxy = '0xF62b116fFBCA075141805E3E1cd2676124F3D7DD'; 
const redeemedHashesAddr = '0x64447c4BefF8e4BAA318dE1F82627D0bC78843A6'; 

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

        setTimeout(continueExecution, 120000);
        console.log('setTimeout rolling...');

        async function continueExecution() {
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

                wasRedeemed ? tasks[taskId].alreadyCheckedHashes.push(hash) : redeemHash(message, hash, taskId);
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


main();


module.exports = {
    checkHash,
    redeemHash
};


