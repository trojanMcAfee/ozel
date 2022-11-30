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
    l2Signer,
    l2SignerTest,
    l1SignerTest
} = require('./state-vars.js');


const { 
    formatEther,
    formatUnits,
    parseEther,
    parseUnits
 } = ethers.utils;

 const { deployContract } = require('./helpers-eth');




async function checkHash() { 
    const hash = '0x613e67c23f51c1b4b4b6fb8b94ef128f1c6ca11892965313018ecd611b84c7b7';
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

    const accountDetails = [
        callerAddr,
        usdtAddrArb, 
        defaultSlippage
    ];

    const factoryProxyAddr = '0xf616eA563Fd2A85b066f37932156a327B383a349';
    const factoryProxy = await hre.ethers.getContractAt(factoryABI, factoryProxyAddr);
    console.log('Proxy Factory: ', factoryProxy.address);

    const tx = await factoryProxy.createNewProxy(accountDetails);
    const receipt = await tx.wait();

    console.log('receipt: ', receipt);
}


async function main2() {
    const callerAddr = await signerX.getAddress();
    console.log('caller addr: ', callerAddr);

    const storageBeaconAddr = '0x41dfb47e2949F783cf490D2e99E9BbB6FdAdAe1C';
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);
    console.log('sBeacon: ', storageBeacon.address);

    const proxies = await storageBeacon.getAccountsByUser(callerAddr);
    const taskID = await storageBeacon.getTaskID(proxies[1]);
    console.log('taskID: ', taskID);
}



async function main4() {
    const callerAddr = await signerX.getAddress();
    console.log('caller addr: ', callerAddr);

    const fakeOZL = '0xAb6E71331EB929251fFbb6d00f571DDdC4aC1D9C';
    const nodeInterfaceAddr = '0x00000000000000000000000000000000000000C8';
    const nodeInterface = await hre.ethers.getContractAt('NodeInterface', nodeInterfaceAddr);
    const accountDetails = [
        callerAddr,
        usdtAddrArb, 
        defaultSlippage
    ];

    const iface = new ethers.utils.Interface(diamondABI);
    const encodedData = iface.encodeFunctionData('exchangeToAccountToken', [accountDetails]);

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
        console.log('x: ', gas);
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

    const tx = await proxy1.changeAccountToken(usdt);
    await tx.wait();

    const inDB = await sBeacon.queryTokenDatabase(usdt);
    console.log('is in DB (true): ', inDB);
}


async function main13() {
    // const provider = await hre.ethers.provider;
    const provider = new ethers.providers.JsonRpcProvider(process.env.GOERLI);
    const wallet = await new ethers.Wallet(process.env.PK, provider);


    ops.nonce = 450;
    ops.to = '0x2B75D8312cA463Dea9E80981b5c690f15E94Bd55';
    ops.value = parseEther('0.01');
    let tx = await wallet.sendTransaction(ops);
    let receipt = await tx.wait();
    console.log('hash: ', receipt.transactionHash);
    console.log('sent out');

    // ops.nonce = 431;
    // ops.to = '0x2B75D8312cA463Dea9E80981b5c690f15E94Bd55';
    // ops.value = parseEther('0.01');
    // tx = await wallet.sendTransaction(ops);
    // receipt = await tx.wait();
    // console.log('hash: ', receipt.transactionHash);
    // console.log('sent out');

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

    let [ user, token, slippage ] = await proxy1.getAccountDetails();
    console.log('slippage - (100): ', Number(slippage));

    const tx = await proxy1.changeAccountSlippage(funcParam, ops);
    await tx.wait();

    ([ user, token, slippage ] = await proxy1.getAccountDetails());
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

    let [ user, token, slippage ] = await proxy1.getAccountDetails();
    console.log('slippage - (100): ', Number(slippage)); //old slippage

    let tx = await proxy1.changeAccountSlippage(funcParam, ops);
    await tx.wait();

    ([ user, token, slippage ] = await proxy1.getAccountDetails());
    console.log('slippage - (20): ', Number(slippage)); //new slippage

    //---------

    const [usdt] = await sBeacon.getTokenDatabase();

    tx = await proxy1.changeAccountToken(usdt);
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
    
    const [ proxies, names ] = await storageBeacon.getAccountsByUser(myAddr);
    console.log('proxies: ', proxies);
    console.log('names: ', names);
    const proxy1 = await hre.ethers.getContractAt('ozPayMe', proxy1Addr);

    // let [ user, token, slippage, name ] = await proxy1.getAccountDetails();
    // console.log('user: ', user);
    // console.log('token: ', token);
    // console.log('slippage %: ', Number(slippage)/100);
    // console.log('name: ', name);
    // console.log('.');

    // tx = await proxy1.changeAccountTokenNSlippage(wbtcAddr, 1);
    // await tx.wait();

    // ([ user, token, slippage, name ] = await proxy1.getAccountDetails());
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

    const accountDetails = [
        signerAddr,
        usdtAddrArb,
        parseInt(0.5 * 100),
        'test account'
    ];

    const tx = await proxyFactory.createNewProxy(accountDetails, ops);
    const receipt = await tx.wait();
    console.log('createNewProxy with hash: ', receipt.transactionHash);
    const newProxyAddr = receipt.logs[0].address;
    console.log('newProxy: ', newProxyAddr);
}



async function lastPart() {
    const signerAddr = '0x0E743a1E37D691D8e52F7036375F3D148B4116ba';

    const accountDetails = [
        signerAddr,
        usdtAddrArb,
        defaultSlippage,
        'test account'
    ];

    //------

    const beaconAddr = '0xeC934e548f0e42aDE66404C3E5Cce436b8Cb4A2F';
    const beacon = await hre.ethers.getContractAt('ozUpgradeableBeacon', beaconAddr);
    const ozERC1967proxyAddr = '0x90a8197d3B8a55504cDF3Af68D85d8eB884561fb';
    const storageBeaconAddr = '0x216FD2A1DD6D2a8544cB5F75E6E39A121DA86D0c';
    const proxyFactory = await hre.ethers.getContractAt('ProxyFactory', ozERC1967proxyAddr);
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);

    //--------

    // const [ redeemedHashesAddr, redeemedHashes ] = await deployContract('RedeemedHashes', '', l2SignerTest); 

    // //Deploys Auth
    // constrArgs = [ 
    //     signerAddr,
    //     beaconAddr
    // ];

    // const [ rolesAuthorityAddr, rolesAuthority ] = await deployContract('RolesAuthority', constrArgs, l1SignerTest);
    // await beacon.setAuth(rolesAuthorityAddr, ops);
    // console.log('set auth done...');

    // //Set ERC1967Proxy to role 1 and gives it authority to call the functions in StorageBeacon
    // await rolesAuthority.setUserRole(ozERC1967proxyAddr, 1, true, ops);
    // console.log('set user role done...');

    // await rolesAuthority.setRoleCapability(1, storageBeaconAddr, '0xcb05ce19', true, ops); //saveUserToDetails(address,(address,address,uint256,string))
    // console.log('set role 1 done...');
    // await rolesAuthority.setRoleCapability(1, storageBeaconAddr, '0xf2034a69', true, ops); //saveTaskId(address proxy_, bytes32 id_)
    // console.log('set role 2 done...');

    //Creates 1st proxy
    tx = await proxyFactory.createNewProxy(accountDetails, ops);
    receipt = await tx.wait();
    console.log('createNewProxy with hash: ', receipt.transactionHash);
    const newProxyAddr = receipt.logs[0].address;
    console.log('proxy 1: ', newProxyAddr);

    //Gets user's task id
    const taskId = await storageBeacon.getTaskID(newProxyAddr, ops);
    console.log('task id: ', taskId.toString());

}


lastPart();