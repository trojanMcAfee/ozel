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
    const storageBeaconAddr = '0xab1701BD39070B2a714B844b319f0815EF88b6e4'; //good: 0xbAa31ba0aBFad51199e899900ea6E0b08Bd15304 / manualRedeem: 0x4e35355c5028FB1ba2229C310dd9c4Ff5286F91a 
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);
    const proxy = '0x20f7F1032797da7C2A9054c859DE479885A0786D'; //good: 0xAEa934d83F62d07BdAE032ecD1C3D7fA6C55fA04 / manualRedeem: 0xc42e2E3B2F54D61c2BA2FcdF71497549941F5cc0
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

        const result = await axios.post(URL, query(taskId));
        const executions =  result.data.data.tasks[0].taskExecutions;
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