const { fork } = require('node:child_process');
const redeemFork = fork('test/eth-tests/listener-test/redeem-fork.js');

let proxyQueue, storageBeacon, redeemedHashes;
let turn = true;


process.on('message', (msg) => {
    proxyQueue = msg;

    if (turn) {
        checkProxyQueue(proxyQueue);
        turn = false;
    }
});


function checkProxyQueue(proxyQueue) {
    if (proxyQueue.length > 0) {
        proxy = proxyQueue.shift();
        process.send(true);
        
        setTimeout(continueExecution, 60000, proxy);
        console.log('Wait 1 minute to query Gelato subgraph for L1 transaction hashes...');
        console.log('-------------------------- Redeem checkup --------------------------');
    } else {
        console.log('THE END');
        turn = true;
    }
} 

redeemFork.on('message', (msg) => checkProxyQueue(proxyQueue));

const continueExecution = (proxy) => redeemFork.send({ proxy });