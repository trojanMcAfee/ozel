const { fork } = require('node:child_process');
const redeemFork = fork('redeem-fork.js');

let proxyQueue, storageBeacon, redeemedHashes;
let turn = true;


process.on('message', (msg) => {
    ({ proxyQueue, storageBeacon, redeemedHashes } = msg);

    if (turn) {
        checkProxyQueue(proxyQueue);
        turn = false;
    }
});

redeemFork.on('message', (msg) => checkProxyQueue(proxyQueue));

function checkProxyQueue(proxyQueue) {
    if (proxyQueue.length > 0) {
        proxy = proxyQueue.shift();
        process.send(true);

        setTimeout(continueExecution, 60000, {proxy, storageBeacon, redeemedHashes});
        console.log('Wait 1 minute to query Gelato subgraph for L1 transaction hashes...');
        console.log('-------------------------- Redeem checkup --------------------------');
    } else {
        console.log('THE END');
        turn = true;
    }
} 

const continueExecution = (params) => redeemFork.send(params);