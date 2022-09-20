const { ethers, Wallet } = require("ethers");
const { defaultAbiCoder: abiCoder } = ethers.utils;
const axios = require('axios').default;
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');
const { assert } = require('console');

const {
    l1ProviderTestnet,
    l2ProviderTestnet,
    network,
    signerTestnet,
    testnetReceiver
} = require('../../scripts/state-vars.js');


const l2Wallet = new Wallet(process.env.PK_TESTNET, l2ProviderTestnet);
const tasks = {};
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
// let newProxyAddr;

 

async function startListening(storageBeaconAddr, newProxyAddr, redeemedHashesAddr) {
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);

    const filter = {
        address: newProxyAddr, 
        topics: [
            ethers.utils.id("FundsToArb(address,address,uint256)") 
        ]
    };

    console.log('listening for the bridge transaction from mainnet to arbitrum...');

    await hre.ethers.provider.once(filter, async (encodedData) => {
        let codedProxy = encodedData.topics[1];
        let [ proxy ] = abiCoder.decode(['address'], codedProxy);
        let taskId = await storageBeacon.getTaskID(proxy);

        //ETH has been sent out from the proxy by the Gelato call
        const balance = await hre.ethers.provider.getBalance(proxy);
        assert(Number(balance) === 0);
        console.log('balance post (should be 0): ***** ', Number(balance));

        if (!tasks[taskId]) {
            tasks[taskId] = {};
            tasks[taskId].alreadyCheckedHashes = [];
        }

        //Waits to query Gelato's subgraph for the tx hashes
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

                wasRedeemed ? tasks[taskId].alreadyCheckedHashes.push(hash) : redeemHash(message, hash, taskId, redeemedHashesAddr);
                // console.log('alreadyCheckedHashes ******: ', tasks[taskId].alreadyCheckedHashes);
            }

            //----------
            const redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);
            const redemptions = await redeemedHashes.connect(l2Wallet).getTotalRedemptions();
            console.log('redemptions: ', redemptions);
            console.log('checked hashes: ', tasks[taskId].alreadyCheckedHashes);
            //--------

            setTimeout(waitingForFunds, 600000);
            console.log(`Waiting for funds in L2 (takes 10 minutes; current time: ${new Date().toTimeString()})`);

            async function waitingForFunds() { 
                const balance = await l2ProviderTestnet.getBalance(testnetReceiver);
                assert(Number(balance) > 0);
                console.log('balance post (should be more than 0): ***** ', Number(balance));
            }
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




module.exports = {
    startListening
};


