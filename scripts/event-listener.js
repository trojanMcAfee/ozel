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
                            executedAt
                            success
                        }
                    }
                }
            `
        }
    };
    const storageBeaconAddr = '0x3CE5a7a6DcC47e45c03764C12B346f2BccF1C97C'; //0xa6aA583E1Ab33F9E7ED99560e1dfD211332F7FbB
    // const emitterAddr = '0xC06D6180e0387804bbcd36372F80D63B05144073';
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);
    const ozPayMeAddr = '0x410AE3E0306F16d120A4e8430244bcB17A52A593';

    const filter = {
        address: ozPayMeAddr, //emitterAddr
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
        console.log('result: ', result.data.data);
    });

}



main();