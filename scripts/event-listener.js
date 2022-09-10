const { ethers } = require('ethers');
const { defaultAbiCoder: abiCoder } = ethers.utils;
const axios = require('axios');

async function main() {
    const URL = `https://api.thegraph.com/subgraphs/name/gelatodigital/poke-me-rinkeby/graphql?query=+query+executions%7B%0A++++++++tasks%28where%3A+%7Bid%3A+%22${taskId}%22%7D%29+%7B%0A++++++++++id%0A++++++++++taskExecutions+%7B%0A%09%09%09%09%09%09id%2C%0A++++++++++++executedAt%0A++++++++++++success%0A++++++++++%7D%0A++++++++%7D%0A++++++%7D`;
    const storageBeaconAddr = '0xa6aA583E1Ab33F9E7ED99560e1dfD211332F7FbB';
    const emitterAddr = '0xC06D6180e0387804bbcd36372F80D63B05144073';
    let taskId;
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);

    const filter = {
        address: emitterAddr,
        topics: [
            ethers.utils.id("ShowTicket(address)")
        ]
    };

    await hre.ethers.provider.on(filter, async (encodedData) => {
        let codedProxy = encodedData.topics[1];
        let proxy = abiCoder.decode(['address'], codedProxy);

        console.log('proxy in listener: ', proxy);

        taskId = (await storageBeacon.getTaskID(proxy)).toString();

        const result = await axios.post(URL);
        console.log('result: ', result);
    });

}



main();