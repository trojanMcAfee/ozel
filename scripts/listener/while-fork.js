const { fork } = require('node:child_process');
const redeemFork = fork('redeem-fork.js');

let proxyQueue;
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
    } else {
        console.log('THE END');
        turn = true;
    }
} 

redeemFork.on('message', (msg) => checkProxyQueue(proxyQueue));

const continueExecution = (proxy) => redeemFork.send({ proxy });