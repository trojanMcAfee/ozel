const { ethers, Wallet } = require("ethers");
const axios = require('axios').default;
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');

const {
    l1ProviderTestnet,
    l2ProviderTestnet,
    network,
    signerTestnet,
    ops,
    pokeMeOpsAddr
} = require('./state-vars.js');

async function queryRedeemedContract() {
    const taskId = '0xfa9ebee08887c78fe1ab22bd0a752e4cd8eb1bfe0764f5cc86121231b0dfa283';
    const redeemedHashesAddr = '0x9101b069c44FBF652af201f7077A32DEcA0bE57E';
    const redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);

    const total = await redeemedHashes.getTotalRedemptions();
    console.log('total redemptions: ', total);

    const hash = '0x67ec49d24ba73d53885f76f10ead3919a602d898c8b263e2153cbd731470fc75';
    const redeemed = await redeemedHashes.wasRedeemed(taskId, hash);
    console.log('was redemeed: ', redeemed);

    const redeemsPerTask = await redeemedHashes.getRedeemsPerTask(taskId);
    console.log('per task: ', redeemsPerTask); 
}

// queryRedeemedContract();


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


async function checkTicketStatus() {
    const hash = '0xcf3019f063eeb49c471e39f125e030134e7a1dc9e7e6c131d3bc17031258c711';
    const l2Wallet = new Wallet(process.env.PK, l2ProviderTestnet);

    let receipt = await l1ProviderTestnet.getTransactionReceipt(hash);
    let l1Receipt = new L1TransactionReceipt(receipt);
    let message = await l1Receipt.getL1ToL2Message(l2Wallet);
    let status = (await message.waitForStatus()).status;

    console.log('status: ', status);
}

// checkTicketStatus();


async function check() {
    const sBeaconAddr = '0x2a3EFe472B287e5Dc60cE3Db063f053ad73eBCC6';
    const sBeacon = await hre.ethers.getContractAt('StorageBeacon', sBeaconAddr);
    const signerAddr = await signerTestnet.getAddress();
    console.log('signer address: ', signerAddr);

    const proxy = await sBeacon.getProxyByUser(signerAddr);
    console.log('proxy: ', proxy);

}

// check();


async function checkHash(hash) { 
    const l2Wallet = new Wallet(process.env.PK_TESTNET, l2ProviderTestnet);

    const receipt = await l1ProviderTestnet.getTransactionReceipt(hash);
    const l1Receipt = new L1TransactionReceipt(receipt);
    const message = await l1Receipt.getL1ToL2Message(l2Wallet);
    const status = (await message.waitForStatus()).status;
    const wasRedeemed = status === L1ToL2MessageStatus.REDEEMED ? true : false;
    console.log('was: ', wasRedeemed);

    return [
        message,
        wasRedeemed
    ];
}

// checkHash('0x2e629883f2863b972a1e58e161e1b9935ea8af925546b7502289a3ee1f4cffde');

async function redeemHash() { 
    const hash = '0x39e0ab8e991cc2582ffee4d40079ec50cbfa1eeccce5f24b808e898d027e675a';
    const [ message ] = await checkHash(hash);

    console.log(2.1);
    let tx = await message.redeem(ops);
    console.log(3);
    await tx.wait();
    console.log(4);
}

// redeemHash();


async function tryProvider() {
    const provider = hre.ethers.provider;
    const x = await provider.getGasPrice();
    console.log('x3: ', Number(x));
}

// tryProvider();


async function tryImpersonating() { 
    let proxy = '0xaf4181d7208912b151d1BA11d22EA4e24FF500ce';
    let taskCreator = '0xd9140951d8aE6E5F625a02F5908535e16e3af964';
    let isEvil = false;
    let evilParams = '';
    

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [pokeMeOpsAddr],
    });

    const opsSigner = await hre.ethers.provider.getSigner(pokeMeOpsAddr);
    let iface = new ethers.utils.Interface(['function checker()']);
    const resolverData = iface.encodeFunctionData('checker');
    const ops = await hre.ethers.getContractAt('IOps', pokeMeOpsAddr);
    const resolverHash = await ops.connect(opsSigner).getResolverHash(proxy, resolverData);

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [pokeMeOpsAddr],
    });

    //------
    const [signer] = await hre.ethers.getSigners();
    await signer.sendTransaction({
        to: gelatoAddr,
        value: ethers.utils.parseEther('1')
    });
    //------

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [gelatoAddr],
    });

    const gelatoSigner = await hre.ethers.provider.getSigner(gelatoAddr); 
    iface = new ethers.utils.Interface([`function sendToArb(${isEvil ? 'tuple(uint256 maxSubmissionCost, uint256 gasPriceBid, uint256 autoRedeem) varConfig_, tuple(address user, address userToken, uint256 userSlippage) userDetails_)' : ')'}`]); 
    let execData;
    if (isEvil) {
        execData = iface.encodeFunctionData('sendToArb', evilParams);
    } else {
        execData = iface.encodeFunctionData('sendToArb');
    }

    const tx = await ops.connect(gelatoSigner).exec(0, ETH, taskCreator, false, false, resolverHash, proxy, execData);
    const receipt = await tx.wait();

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [gelatoAddr],
    });

    return receipt;
}


