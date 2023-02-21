const { 
    pokeMeOpsAddr,
    usdtAddrArb,
    usdcAddr,
    inbox,
    wethAddr,
    gelatoAddr,
    ETH,
    swapRouterUniAddr,
    poolFeeUni,
    chainlinkAggregatorAddr,
    factoryABI,
    myReceiver,
    ops,
    fraxAddr,
    proxyABIeth,
    opsL2,
    mimAddr,
    wbtcAddr,
    defaultSlippage
} = require('./state-vars.js');

const { 
    getArbitrumParams,
    getFakeOZLVars,
    deployContract,
    getInitSelectors,
    sendETH,
    activateProxyLikeOps
 } = require('./helpers-eth.js');

const { parseEther, formatEther } = require('ethers/lib/utils');



async function main() {
    const redeemedHashesAddr = '0xD617AfE3D42Ca8e5a1514A90Ec14020E85993079';
    const redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);
    const newOwner = '0x366D9C2cf28A2A5A4d80879964AF1EBb7D7dB086';

    let owner = await redeemedHashes.owner();
    console.log('owner old: ', owner);

    const tx = await redeemedHashes.transferOwnership(newOwner);
    const receipt = await tx.wait();
    console.log('done: ', receipt.transactionHash);

    owner = await redeemedHashes.owner();
    console.log('owner new: ', owner);

}

// main();


async function fixSlippage() {
    const deployer2 = '0xe738696676571D9b74C81716E4aE797c2440d306';
    const beaconAddr = '0xB318dE9d697933bF9BF32861916A338B3e7AbD5a';
    const emitterAddr = '0xd986Ac35f3aD549794DBc70F33084F746b58b534';
    const ozMiddlewareAddr = '0x3164a03cDbbf607Db19a366416113f7f74341B56';
    const beacon = await hre.ethers.getContractAt('ozUpgradeableBeacon', beaconAddr);
    const [ signer ] = await hre.ethers.getSigners();

    ops.value = parseEther('3');
    ops.to = deployer2;
    await signer.sendTransaction(ops);
    delete ops.value;
    delete ops.to;

    let impl = await beacon.implementation();
    console.log('impl pre: ', impl);
    //--------

    const constrArgs = [
        pokeMeOpsAddr,
        gelatoAddr,
        emitterAddr,
        ozMiddlewareAddr
    ];

    const [ newPaymeAddr ] = await deployContract('ozPayMe', constrArgs); //remember to get rid of ops
    //------

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [deployer2],
    });

    const deployerSigner = await hre.ethers.provider.getSigner(deployer2);
    let tx = await beacon.connect(deployerSigner).upgradeTo(newPaymeAddr);
    await tx.wait();

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [pokeMeOpsAddr],
    });

    impl = await beacon.implementation();
    console.log('impl post: ', impl);
    console.log('UPGRADE DONE *****');

    //----- UPGRADE DONE --------
}


// fixSlippage();


async function fixSlippageMainnet() {
    const deployer2 = '0xe738696676571D9b74C81716E4aE797c2440d306';
    const beaconAddr = '0xB318dE9d697933bF9BF32861916A338B3e7AbD5a';
    const emitterAddr = '0xd986Ac35f3aD549794DBc70F33084F746b58b534';
    const ozMiddlewareAddr = '0x3164a03cDbbf607Db19a366416113f7f74341B56';
    const beacon = await hre.ethers.getContractAt('ozUpgradeableBeacon', beaconAddr);

    const constrArgs = [
        pokeMeOpsAddr,
        gelatoAddr,
        emitterAddr,
        ozMiddlewareAddr
    ];

    const [ newPaymeAddr ] = await deployContract('ozPayMe', constrArgs);

    let impl = await beacon.implementation();
    console.log('impl pre: ', impl);

    let tx = await beacon.upgradeTo(newPaymeAddr);
    const receipt = await tx.wait();
    console.log('Upgrade done with: ', receipt.transactionHash);

    impl = await beacon.implementation();
    console.log('impl post: ', impl);

}

fixSlippageMainnet(); //check it's on mainnet on hardhat.config and check state-vars.js





async function fixSlippageGoerli() {
    const beaconAddr = '0x6A5d86a06a3ba16ee6314E225478d5679559075a';
    const beacon = await hre.ethers.getContractAt('ozUpgradeableBeacon', beaconAddr);
    const newOwner = '0xe7858016db2548359ef3a8212AcD5b08D9BAe8d8';
    const emitterAddr = '0x3b5f3a90fb6179Ae2471497cb83f3bF8F866aaaD';
    const ozMiddlewareAddr = '0x938Dc5298D505B06B5Ba542e461c665923eD0519';

    const constrArgs = [
        pokeMeOpsAddr,
        gelatoAddr,
        emitterAddr,
        ozMiddlewareAddr
    ];

    console.log('deploying...');
    const [ newPaymeAddr ] = await deployContract('ozPayMe', constrArgs);
    let impl = await beacon.implementation();
    console.log('impl old: ', impl);

    let tx = await beacon.upgradeTo(newPaymeAddr);
    let receipt = await tx.wait();
    console.log('Beacon upgraded: ', receipt.transactionHash);
    impl = await beacon.implementation();
    console.log('impl new: ', impl);

}

// fixSlippageGoerli();