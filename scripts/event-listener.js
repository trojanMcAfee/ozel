const { ethers } = require('ethers');
const { defaultAbiCoder: abiCoder } = ethers.utils;
const axios = require('axios');

async function main() {
    const URL = `https://api.thegraph.com/subgraphs/name/gelatodigital/poke-me-rinkeby/graphql?query=+query+executions%7B%0A++++++++tasks%28taskId%3A+%22${taskId}%22%29+%7B%0A++++++++++id%0A++++++++++taskExecutions+%7B%0A%09%09%09%09%09%09id%2C%0A++++++++++++success%0A++++++++++%7D%0A++++++++%7D%0A++++++%7D`;
    const storageBeaconAddr = '';
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);

    const filter = {
        address: emitterAddr,
        topics: [
            ethers.utils.id("ShowTicket(uint256)")
        ]
    };


    await hre.ethers.provider.on(filter, async (encodedData) => {
        const codedUser = encodedData.topics[1];
        const user = abiCoder.decode(['address'], codedUser);

        const codedTicket = encodedData.topics[2];
        const ticketId = abiCoder.decode(['uint'], codedTicket);



    });

}



main();