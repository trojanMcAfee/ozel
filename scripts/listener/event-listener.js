const { fork } = require('node:child_process');
const { ethers } = require("ethers");
const whileFork = fork('while-fork.js');
const { defaultAbiCoder: abiCoder } = ethers.utils;

const emitterAddr = '0x45cEaeAB767265352977E136234E4A0c3d5cDC44'; 
const proxyQueue = [];


async function main() {

    const filter = {
        address: emitterAddr, 
        topics: [
            ethers.utils.id("ShowTicket(address)") 
        ]
    };

    console.log('listening...');

    await hre.ethers.provider.on(filter, async (encodedData) => { 
        let codedProxy = encodedData.topics[1];
        let [ proxy ] = abiCoder.decode(['address'], codedProxy);

        if (proxyQueue.indexOf(proxy) === -1) proxyQueue.push(proxy);

        whileFork.send(proxyQueue);
    });

    whileFork.on('message', (msg) => proxyQueue.shift());
}



main();