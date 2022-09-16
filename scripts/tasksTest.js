const axios = require('axios').default;
const { network } = require('./state-vars.js');

async function queryRedeemedContract() {
    const taskId = '0x9679f8a03a29464759b316c3f4d2c95e9c20fbdfdfa6e2f58d27c66b726d0b63';
    const redeemedHashesAddr = '0x7F5be070110cec511369a7879DC14cECf46b20d4';
    const redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);

    const total = await redeemedHashes.getTotalRedemptions();
    console.log('total redemptions: ', total);

    const hash = '0x7c010eef2ad85d5d43d7f689dac2350289dde186ce8066133c9e900dfd4d45b0';
    const redeemed = await redeemedHashes.wasRedeemed(taskId, hash);
    console.log('was redemeed: ', redeemed);

    const redeemsPerTask = await redeemedHashes.getRedeemsPerTask(taskId);
    console.log('per task: ', redeemsPerTask); 
}

queryRedeemedContract();


async function main() {
    const Redeem = await hre.ethers.getContractFactory('RedeemedHashes');
    const redeem = await Redeem.deploy();
    await redeem.deployed();
    console.log('redeem deployed to: ', redeem.address);

    const hash = '0xfb0b38a68a3b331c28b0045df952bd1a7fbaa29d4284e185e440180f3941b7af';
    const taskId = '0xb6fd8625541b1f084582b7af4cb549cfcc712b291ea73b0699313644ed92bf14';
    await redeem.storeRedemption(taskId, hash);

    const is = await redeem.wasRedeemed(taskId, hash);
    console.log('should be true *****: ', is);

}

// main();


async function testQuery() {
    const taskId = '0x9679f8a03a29464759b316c3f4d2c95e9c20fbdfdfa6e2f58d27c66b726d0b63';
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

    let result = await axios.post(URL, query(taskId));
    let executions =  result.data.data.tasks[0].taskExecutions;
    console.log('executions: ', executions);
}

// testQuery();
