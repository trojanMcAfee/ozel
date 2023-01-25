const { fork } = require('node:child_process');
const { ethers } = require("ethers");
const whileFork = fork('test/eth-tests/listener-test/while-fork.js');

const { defaultAbiCoder: abiCoder } = ethers.utils;

const proxyQueue = {
    proxies: [],
    deets: []
};


async function startListening(storageBeaconAddr, emitterAddr, redeemedHashesAddr) { 

    const filter = {
        address: emitterAddr, 
        topics: [
            ethers.utils.id("ShowTicket(address,address)") 
        ]
    };

    console.log('-------------------------- Bridging --------------------------');
    console.log('Listening for the bridge transaction from L1 to L2...');

    await hre.ethers.provider.on(filter, async (encodedData) => { 
        let codedProxy = encodedData.topics[1];
        let codedOwner = encodedData.topics[2];
        let [ proxy ] = abiCoder.decode(['address'], codedProxy);
        let [ owner ] = abiCoder.decode(['address'], codedOwner);

        if (proxyQueue.proxies.indexOf(proxy) === -1) {
            proxyQueue.proxies.push(proxy);
            proxyQueue.deets.push({ proxy, owner });
        }

        whileFork.send({
            proxyQueue,
            storageBeaconAddr,
            redeemedHashesAddr
        });
    });

    whileFork.on('message', (msg) => {
        proxyQueue.proxies.shift();
        proxyQueue.deets.shift();
    });
}

//add an if saying that tests won't run if there's not enough goerli ETH

module.exports = {
    startListening
};