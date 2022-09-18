const { ethers } = require('ethers');
const { parseEther } = ethers.utils;
const { deployTestnet } = require('../../scripts/begin-testnet.js');
const { startListening } = require('./event-listener-for-test.js');

const { ops } = require('../../scripts/state-vars.js');
const { assert } = require("console");



async function main() {

    const [
        l1SignerTest,
        storageBeaconAddr,
        newProxyAddr,
        redeemedHashesAddr
    ] = await deployTestnet(true);

    await startListening(storageBeaconAddr, proxy, redeemedHashesAddr);

    //Showing that ASSERT is working properly
    assert(1 > 2); //<---- should appear as "Assertion Failed" in the logs

    //Sends ETH to the proxy
    ops.to = newProxyAddr;
    ops.value = parseEther('0.01');
    await l1SignerTest.sendTransaction(ops);

    let balance = await hre.ethers.provider.getBalance(newProxyAddr);
    assert(Number(balance) === 0.01);
    console.log('ETH successfully received');
}

main();



