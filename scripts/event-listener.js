const { ethers, providers, Wallet } = require("ethers");
const { defaultAbiCoder: abiCoder } = ethers.utils;
const axios = require('axios').default;
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');

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
//taskId (good one): 0xc5ca4e141d2134e32ef3b779374fde598c354168ff4aa04ebf933dfd07363f21 - manualRedeem: 0xb6fd8625541b1f084582b7af4cb549cfcc712b291ea73b0699313644ed92bf14


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
            tasks[taskId].redeemedHashes = [];
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
                
                console.log('checkedHash: ', checkedHash);

                if (hash === checkedHash) {
                    console.log('here ***');
                    if (i === executions.length - 1) console.log('tasks1: ', tasks);
                    continue parent;
                } else if (
                    j === tasks[taskId].alreadyCheckedHashes.length - 1 < 0 ?
                    0 : 
                    tasks[taskId].alreadyCheckedHashes.length - 1
                ) {
                    if (i === executions.length - 1) console.log('tasks2: ', tasks);
                    console.log('here2');
                    redeemHash(hash, taskId);
                }
            }
        }
    });
}


async function redeemHash(hash, taskId) {
    console.log('here3');
    let receipt = await l1Provider.getTransactionReceipt(hash);
    let l1Receipt = new L1TransactionReceipt(receipt);
    let message = await l1Receipt.getL1ToL2Message(l2Wallet);
    let status = (await message.waitForStatus()).status;

    if (status === L1ToL2MessageStatus.REDEEMED) {
        console.log('here4');
        if (tasks[taskId].alreadyCheckedHashes.indexOf(hash) === -1) tasks[taskId].alreadyCheckedHashes.push(hash); 
        console.log('tasks in redeemHash: ', tasks);
        console.log('length: ', tasks[taskId].alreadyCheckedHashes.length);
    } else {
        console.log('here5');
        await message.redeem({
            gasLimit: ethers.BigNumber.from('5000000'),
            gasPrice: ethers.BigNumber.from('40134698068')
        });
        console.log('redeemed');

        tasks[taskId].redeemedHashes.push(hash);
        tasks[taskId].alreadyCheckedHashes.push(hash);
    }

}

// function getTasks() {
//     return tasks;
// }



main();


// module.exports = {getTasks};
// exports.tasks = tasks;