const { 
    usdtAddrArb,
    defaultSlippage,
    diamondABI,
    wbtcAddr,
    pokeMeOpsAddr,
    ops,
    opsL2_2
} = require('../../../scripts/state-vars');

const { deployV1_1, activateProxyLikeOpsL2, getAccData } = require('../../../scripts/helpers-arb');
const { deployContract } = require('../../../scripts/helpers-eth');
const { parseEther, formatEther } = require('ethers/lib/utils');

async function main() {
    const fakeOZLaddr = '0xAa5f138691768EDEaD231915eF7AB9370A708d70';
    const fakeOZL = await hre.ethers.getContractAt('FakeOZL', fakeOZLaddr);
    const deployer2 = '0xe738696676571D9b74C81716E4aE797c2440d306';
    const [signer] = await hre.ethers.getSigners();
    const signerAddr = await signer.getAddress();
    const pokeMeOpsAddr = '0xa5f9b728ecEB9A1F6FCC89dcc2eFd810bA4Dec41';

    const accountDetails = [
        signerAddr,
        usdtAddrArb,
        defaultSlippage,
        'test'
    ];

    //Deploys ozMiddleware
    ([ ozMiddlewareAddr, ozMiddleware ] = await deployContract('ozMiddlewareTest', [fakeOZL.address]));

    //Deploys ozUpgradeableBeaconL2
    ([ beaconAddr, beacon ] = await deployContract('UpgradeableBeacon', [ ozMiddlewareAddr ]));

    //Deploys the ProxyFactory in L2
    let constrArgs = [pokeMeOpsAddr, beaconAddr];
    ([ factoryAddr, factory ] = await deployContract('ozProxyFactoryTest', constrArgs));

    let tx = await factory.createNewProxy(accountDetails, opsL2_2);
    let receipt = await tx.wait();
    const account = receipt.events[0].address;
    console.log('Account created: ', receipt.transactionHash);
    console.log('acc: ', account);

    //-----
    tx = await signer.sendTransaction({
        to: account,
        value: parseEther('1')
    });
    receipt = await tx.wait();
    console.log('eth sent: ', receipt.transactionHash);

    let balance = await hre.ethers.provider.getBalance(account);
    console.log('bal pre: ', formatEther(balance));

    const accData = getAccData(signerAddr, usdtAddrArb, defaultSlippage);
    await activateProxyLikeOpsL2(account, signerAddr, accData);

    balance = await hre.ethers.provider.getBalance(account);
    console.log('bal post: ', formatEther(balance));

}

main();