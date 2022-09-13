const { ethers } = require('ethers');
const { defaultAbiCoder: abiCoder } = ethers.utils;
const axios = require('axios').default;

const l1Provider = new providers.JsonRpcProvider(process.env.RINKEBY);
const l2Provider = new providers.JsonRpcProvider(process.env.ARB_TESTNET);
const l2Wallet = new Wallet(process.env.PK, l2Provider);

const URL = 'https://api.thegraph.com/subgraphs/name/gelatodigital/poke-me-rinkeby';
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

const storageBeaconAddr = '0xab1701BD39070B2a714B844b319f0815EF88b6e4'; //manualRedeem: 0x4e35355c5028FB1ba2229C310dd9c4Ff5286F91a 
const proxy = '0x20f7F1032797da7C2A9054c859DE479885A0786D'; //manualRedeem: 0xc42e2E3B2F54D61c2BA2FcdF71497549941F5cc0
const tasks = {};


async function main() {
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);
    const failedHashes = [];
    // const alreadyCheckedHashes = [];

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
        const taskId = await storageBeacon.getTaskID(proxy);

        if (!tasks.taskId) {
            tasks.taskId = {};
            tasks.taskId.alreadyCheckedHashes = [];
            tasks.taskId.redeemedHashes = [];
        }

        const result = await axios.post(URL, query(taskId));
        const executions =  result.data.data.tasks[0].taskExecutions;
        console.log('executions: ', executions);

        for (let i=0; i < executions.length; i++) {
            // if (executions[i].success) {
            //     let [ hash ] = executions[i].id.split(':');
            //     failedHashes.push(hash);
            // }

            let [ hash ] = executions[i].id.split(':');
            //with a nested loop, compare this hash with tasks.taskId.hashes, and redeem if necessary using arb-sdk


        }

        console.log('failedHashes: ', failedHashes);
    });

}



main();