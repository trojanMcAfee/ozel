const { ethers } = require('ethers');
const { defaultAbiCoder: abiCoder } = ethers.utils;
const axios = require('axios').default;

async function main() {
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
    const storageBeaconAddr = '0x4e35355c5028FB1ba2229C310dd9c4Ff5286F91a'; //good: 0xbAa31ba0aBFad51199e899900ea6E0b08Bd15304 / gasPriceBid = 0 - 0x8dDb2f87a8dE0d651CE662CBCf5d626f85B766B6 
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);
    const proxy = '0xc42e2E3B2F54D61c2BA2FcdF71497549941F5cc0'; //good: 0xAEa934d83F62d07BdAE032ecD1C3D7fA6C55fA04 / gasPriceBid = 0 - 0x2d0d5FEA1E54baB9a7574E2d7fC8E19afBA93540
    const failedHashes = [];

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

        const result = (await axios.post(URL, query(taskId))).data.data;
        console.log('result: ', result);
        const executions =  result.tasks[0].taskExecutions;
        console.log('executions: ', executions);

        for (let i=0; i < executions.length; i++) {
            if (executions[i].success) {
                let [ hash ] = executions[i].id.split(':');
                failedHashes.push(hash);
            }
        }

        console.log('failedHashes: ', failedHashes);
    });

}



main();