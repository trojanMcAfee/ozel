const { fork } = require('node:child_process');
const redeemFork = fork('test/eth-tests/listener-test/redeem-fork.js');

let proxyQueue;
let turn = true;


process.on('message', (msg) => {
    ({ proxyQueue, storageBeaconAddr, redeemedHashesAddr } = msg);

    if (turn) {
        checkProxyQueue(proxyQueue, storageBeaconAddr, redeemedHashesAddr);
        turn = false;
    }
});


function checkProxyQueue(proxyQueue, storageBeaconAddr, redeemedHashesAddr) {
    if (proxyQueue.length > 0) {
        proxy = proxyQueue.shift();
        process.send(true);
        
        setTimeout(continueExecution, 60000, {proxy, storageBeaconAddr, redeemedHashesAddr});
        console.log('Wait 1 minute to query Gelato subgraph for L1 transaction hashes...');
        console.log('-------------------------- Redeem checkup --------------------------');
    } else {
        turn = true;
    }
} 

redeemFork.on('message', (msg) => checkProxyQueue(proxyQueue));

const continueExecution = (params) => redeemFork.send(params);