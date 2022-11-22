const { ethers, Wallet } = require("ethers");
const axios = require('axios').default;
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');

const {
    l1ProviderTestnet,
    l2ProviderTestnet,
    network,
    signerTestnet,
    ops,
    pokeMeOpsAddr,
    gelatoAddr,
    ETH,
    signerX,
    defaultSlippage,
    factoryABI,
    diamondABI,
    l2Provider,
    l1Provider,
    renBtcAddr,
    mimAddr,
    usdcAddr,
    fraxAddr,
    usdtAddrArb,
    wbtcAddr,
    deadAddr,
    l2Signer
} = require('./state-vars.js');
const { parseEther, parseUnits } = require("ethers/lib/utils.js");

const { 
    formatEther,
    formatUnits
 } = ethers.utils;




async function checkHash() { 
    const hash = '0x20a7709fd1df71cdb6f6eb0203da1833f748ff2df5a9f1f28fd0deaada62fadf';
    const l2Wallet = new Wallet(process.env.PK, l2ProviderTestnet);

    console.log(1);
    const receipt = await l1ProviderTestnet.getTransactionReceipt(hash);
    console.log(2);
    const l1Receipt = new L1TransactionReceipt(receipt);
    console.log(3);
    const message = await l1Receipt.getL1ToL2Message(l2Wallet);
    console.log(4);
    const status = (await message.waitForStatus()).status;
    console.log(5);
    const wasRedeemed = status === L1ToL2MessageStatus.REDEEMED ? true : false;
    console.log('was2: ', wasRedeemed);

    // return [
    //     message,
    //     wasRedeemed
    // ];
}

// checkHash();



async function main3() {
    const callerAddr = await signerX.getAddress();
    console.log('caller addr: ', callerAddr);

    const userDetails = [
        callerAddr,
        usdtAddrArb, 
        defaultSlippage
    ];

    const factoryProxyAddr = '0xf616eA563Fd2A85b066f37932156a327B383a349';
    const factoryProxy = await hre.ethers.getContractAt(factoryABI, factoryProxyAddr);
    console.log('Proxy Factory: ', factoryProxy.address);

    const tx = await factoryProxy.createNewProxy(userDetails);
    const receipt = await tx.wait();

    console.log('receipt: ', receipt);
}


async function main2() {
    const callerAddr = await signerX.getAddress();
    console.log('caller addr: ', callerAddr);

    const storageBeaconAddr = '0x41dfb47e2949F783cf490D2e99E9BbB6FdAdAe1C';
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);
    console.log('sBeacon: ', storageBeacon.address);

    const proxies = await storageBeacon.getProxyByUser(callerAddr);
    const taskID = await storageBeacon.getTaskID(proxies[1]);
    console.log('taskID: ', taskID);
}



async function main4() {
    const callerAddr = await signerX.getAddress();
    console.log('caller addr: ', callerAddr);

    const fakeOZL = '0xAb6E71331EB929251fFbb6d00f571DDdC4aC1D9C';
    const nodeInterfaceAddr = '0x00000000000000000000000000000000000000C8';
    const nodeInterface = await hre.ethers.getContractAt('NodeInterface', nodeInterfaceAddr);
    const userDetails = [
        callerAddr,
        usdtAddrArb, 
        defaultSlippage
    ];

    const iface = new ethers.utils.Interface(diamondABI);
    const encodedData = iface.encodeFunctionData('exchangeToUserToken', [userDetails]);

    const x = await nodeInterface.nitroGenesisBlock();
    console.log('block: ', Number(x));

    const tx = await nodeInterface.gasEstimateL1Component(fakeOZL, false, encodedData, ops);
    const receipt = await tx.wait();
    console.log('receipt: ', receipt);

    // console.log('gasEstimateForL1: ', a);
    // console.log('baseFee: ', b);
    // console.log('l1BaseFeeEstimate: ', c);

}


async function main11() {

    const l1gas = await l1ProviderTestnet.getGasPrice();
    const l2gas = await l2ProviderTestnet.getGasPrice();

    const l1gasMain = await l1Provider.getGasPrice();
    const l2GasMain = await l2Provider.getGasPrice();

    console.log('gas in arb goerli: ', formatUnits(l2gas, 'gwei'));
    console.log('gas in goerli: ', formatUnits(l1gas, 'gwei'));
    console.log('.');
    console.log('gas in mainnet: ', formatUnits(l1gasMain, 'gwei'));
    console.log('gas in arb: ', formatUnits(l2GasMain, 'gwei'));

}


async function mainf() {
    
    const bridgeAddr = '0xaf4159A80B6Cc41ED517DB1c453d1Ef5C2e4dB72';
    const abi = ['function delayedMessageCount() external view returns (uint256)'];
    const bridge = await hre.ethers.getContractAt(abi, bridgeAddr);

    const msgCount = await bridge.delayedMessageCount();
    console.log('bridge: ', Number(msgCount));

}

async function maint() {

    while(true) {
        const gas = (await l1ProviderTestnet.getGasPrice()).toString();
        console.log('gas: ', formatUnits(gas, 'gwei'));
    }


}

// const abi = require('../artifacts/contracts/ethereum/StorageBeacon.sol/StorageBeacon.json').abi;

async function main() {
    const sBeaconAddr = '0x53548E9698BC27eCfEd86dbC1Bd47d827912CB75';
    const sBeacon = await hre.ethers.getContractAt(abi, sBeaconAddr);

    const tx = await sBeacon.addTokenToDatabase(renBtcAddr);
    const receipt = await tx.wait();
    console.log('receipt: ', receipt);
    // await sBeacon.addTokenToDatabase(mimAddr);
    // await sBeacon.addTokenToDatabase(usdcAddr);
    // await sBeacon.addTokenToDatabase(fraxAddr);
    // await sBeacon.addTokenToDatabase(wbtcAddr);

    const x = await sBeacon.getTokenDatabase();
    console.log('y: ', x);

}



async function main12() {
    let { abi } = require('./UI_ozBeaconABI.json');
    const proxyABI = abi;
    ({abi} = require('./UI_sBeacon.json'));
    const sBeaconABI = abi;

    const proxy1Addr = '0x0246bc2BacE3F5763Dfd505EC0D5bb73EDb566f8';
    const sBeaconAddr = '0x53548E9698BC27eCfEd86dbC1Bd47d827912CB75';

    const proxy1 = await hre.ethers.getContractAt(proxyABI, proxy1Addr);
    const sBeacon = await hre.ethers.getContractAt(sBeaconABI, sBeaconAddr);

    const [usdt] = await sBeacon.getTokenDatabase();

    const tx = await proxy1.changeUserToken(usdt);
    await tx.wait();

    const inDB = await sBeacon.queryTokenDatabase(usdt);
    console.log('is in DB (true): ', inDB);
}


async function main13() {
    // const provider = await hre.ethers.provider;
    const provider = new ethers.providers.JsonRpcProvider(process.env.GOERLI);
    const wallet = await new ethers.Wallet(process.env.PK, provider);


    ops.nonce = 341;
    ops.to = '0x2B75D8312cA463Dea9E80981b5c690f15E94Bd55';
    ops.value = parseEther('0.01');
    let tx = await wallet.sendTransaction(ops);
    const receipt = await tx.wait();
    console.log('hash: ', receipt.transactionHash);
    console.log('sent out');

    // ops.nonce = 313;
    // tx = await wallet.sendTransaction(ops);
    // await tx.wait();

    let count = await hre.ethers.provider.getTransactionCount('0x0E743a1E37D691D8e52F7036375F3D148B4116ba', 'pending');
    console.log('count pen: ', Number(count));

    count = await hre.ethers.provider.getTransactionCount('0x0E743a1E37D691D8e52F7036375F3D148B4116ba', 'latest');
    console.log('count: ', Number(count));
}


async function main() {
    let { abi } = require('./UI_ozBeaconABI.json');
    const proxyABI = abi;
    ({abi} = require('./UI_sBeacon.json'));
    const sBeaconABI = abi;

    const proxy1Addr = '0x0246bc2BacE3F5763Dfd505EC0D5bb73EDb566f8';
    const sBeaconAddr = '0x53548E9698BC27eCfEd86dbC1Bd47d827912CB75';

    const proxy1 = await hre.ethers.getContractAt(proxyABI, proxy1Addr);
    const sBeacon = await hre.ethers.getContractAt(sBeaconABI, sBeaconAddr);

    const userInput = 0.2;
    const funcParam = userInput * 100;

    let [ user, userToken, slippage ] = await proxy1.getUserDetails();
    console.log('slippage - (100): ', Number(slippage));

    const tx = await proxy1.changeUserSlippage(funcParam, ops);
    await tx.wait();

    ([ user, userToken, slippage ] = await proxy1.getUserDetails());
    console.log('slippage - (20): ', Number(slippage));
}


async function maink() {
    const l2Provider = new ethers.providers.JsonRpcProvider(process.env.ARB_GOERLI);
    const fakeOZLaddr = '0xE2C5EbbdE25878153Bd760A1FB7e510eCE5cc19E';
    const fakeOZL = await(await hre.ethers.getContractAt('FakeOZL', fakeOZLaddr)).connect(l2Provider);
    console.log('fakeOZL addr: ', fakeOZLaddr);

    const totalUSD = await fakeOZL.getTotalVolumeInUSD();
    console.log('total vol USD - 500: ', formatEther(totalUSD));

    const totalETH = await fakeOZL.getTotalVolumeInETH();
    console.log('total vol ETH - 400: ', formatEther(totalETH));

    const [ wethUM, valueUM ] = await fakeOZL.getAUM();
    console.log('wethUM - 300: ', formatEther(wethUM));
    console.log('valueUM - 200: ', formatEther(valueUM));

    const ozlBalance = await fakeOZL.balanceOf(fakeOZLaddr);
    console.log('ozl bal - 100: ', formatEther(ozlBalance));

    const [ wethUserShare, usdUserShare ] = await fakeOZL.getOzelBalances(fakeOZLaddr);
    console.log('wethUserShare - 220: ', formatEther(wethUserShare));
    console.log('usdUserShare - 150: ', formatEther(usdUserShare));

    //-------

    let { abi } = require('./UI_ozBeaconABI.json');
    const proxyABI = abi;
    ({abi} = require('./UI_sBeacon.json'));
    const sBeaconABI = abi;

    const proxy1Addr = '0x2aAD9512A6c2e95E6d558e58781424C0E3fe60E2';
    const sBeaconAddr = '0x6FD1b25A2A5C0BEE3269E1B2Ee9c46566aD73846';

    const proxy1 = await hre.ethers.getContractAt(proxyABI, proxy1Addr);
    const sBeacon = await hre.ethers.getContractAt(sBeaconABI, sBeaconAddr);

    const userInput = 0.2;
    const funcParam = userInput * 100;

    let [ user, userToken, slippage ] = await proxy1.getUserDetails();
    console.log('slippage - (100): ', Number(slippage)); //old slippage

    let tx = await proxy1.changeUserSlippage(funcParam, ops);
    await tx.wait();

    ([ user, userToken, slippage ] = await proxy1.getUserDetails());
    console.log('slippage - (20): ', Number(slippage)); //new slippage

    //---------

    const [usdt] = await sBeacon.getTokenDatabase();

    tx = await proxy1.changeUserToken(usdt);
    await tx.wait();

    const inDB = await sBeacon.queryTokenDatabase(usdt);
    console.log('is in DB (true): ', inDB);

    const tokens = await sBeacon.getTokenDatabase();
    console.log('tokens: ', tokens);
}


async function tryUI() {

    const myAddr = '0x0E743a1E37D691D8e52F7036375F3D148B4116ba';
    const storageBeaconAddr = '0x6FD1b25A2A5C0BEE3269E1B2Ee9c46566aD73846';
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);
    const proxy1Addr = '0x1353b75508BEF2844E17ab086562ACEe5810868C';
    
    const [ proxies, names ] = await storageBeacon.getProxyByUser(myAddr);
    console.log('proxies: ', proxies);
    console.log('names: ', names);
    const proxy1 = await hre.ethers.getContractAt('ozPayMe', proxy1Addr);

    // let [ user, token, slippage, name ] = await proxy1.getUserDetails();
    // console.log('user: ', user);
    // console.log('token: ', token);
    // console.log('slippage %: ', Number(slippage)/100);
    // console.log('name: ', name);
    // console.log('.');

    // tx = await proxy1.changeUserTokenNSlippage(wbtcAddr, 1);
    // await tx.wait();

    // ([ user, token, slippage, name ] = await proxy1.getUserDetails());
    // console.log('user: ', user);
    // console.log('token - wbtc: ', token);
    // console.log('slippage % - 0.01: ', Number(slippage)/100);
    // console.log('name - same ^: ', name);
    // console.log('.');


}


async function create() {
    const signerAddr = '0x0E743a1E37D691D8e52F7036375F3D148B4116ba';
    const ozERC1967proxyAddr = '0xb2387018E77A9D08C207C78Ee65631F694a25C46';
    const proxyFactory = await hre.ethers.getContractAt('ProxyFactory', ozERC1967proxyAddr);

    const userDetails = [
        signerAddr,
        usdtAddrArb,
        parseInt(0.5 * 100),
        'test account'
    ];

    const tx = await proxyFactory.createNewProxy(userDetails, ops);
    const receipt = await tx.wait();
    console.log('createNewProxy with hash: ', receipt.transactionHash);
    const newProxyAddr = receipt.logs[0].address;
    console.log('newProxy: ', newProxyAddr);

}


tryUI();