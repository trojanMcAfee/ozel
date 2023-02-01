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
    mimAddr,
    usdcAddr,
    fraxAddr,
    usdtAddrArb,
    wbtcAddr,
    deadAddr,
    l2Signer,
    l2SignerTest,
    l1SignerTest,
    opsL2_2,
    nullAddr
} = require('./state-vars.js');


const { 
    formatEther,
    formatUnits,
    parseEther,
    parseUnits
 } = ethers.utils;

 const { deployContract } = require('./helpers-eth');




async function checkHash() { 
    const other = [
      

    ];

    const hashes = [
       '0x3170fe6a71b772007826c9af48975aecefa0b0e1d56f5af8d9d17a635af8bc07',
       '0x435f21473155de67478de02fd5350bbb6fc9430895950a847c0ecf691b075b7d',
       '0x49ff7bf9dab5beaede250e3f71106db0b7c3a33ea1f2a495ffb9dac5ec456ade',
       '0x76c6bab99b9311f0e7c0ceb7f8f0e178c0742dd4a60fb4b8fe3c7ab75f4e6428',
       '0x88ec4e5102b100fac37f87934e01024038975db6627ce93054fb92176c8a5ffc',
       '0xc3666a9feb11652d04250c6c9f8c127d5232940f52d7f20b96df9f134bf3b27c',
       '0xd999bc9f213549b472064957401fa5712266cf6f65175d4ecf9672f499e5afb4',
       '0x28f6904c3bec8d9eacf31156246748ca59c0292b8f8b2f38567e50889d042848',
       '0x8a83a476b53b743688d4eff8e6efa020aa74c1c84f597bf76c12cb404a42197c',
       '0xc470d1c90f375904ad33803ae184dc06f4be1ca14fb6d9bc0c21d4dfeb218c2b',
       '0xcbeace1f8977d0098cd2beb1a886c68bd9808fedcd6d24e70496fb8ade7735ec',
       '0xd247803363f722d60585f6d2a0012c06ebb9f833dd9488f90904501819e82f10',
       '0xe4bccd57bbf119ce2ef140c5c301361314c887f89411ac61cdfc8727dfdef1d3',
       '0xf7c5371164be15bcee526f2072ec10cce99e289c257983605769a9d7673de11f',
        '0x6a7c1420e41ba7ad9c3dc5ed1f2262f8cd9b58cd96ddec95ff4c4c4a3f96e8eb',
        '0x7a515f99ccac69140e1d5825dbc225dbcee724f562c69cce0b1cfbd081c73975',
        '0x8d87fd32d924a19eac6fa15c49e8f2b44b0f61b3a1b9b6811ba58d51dc720b9c',
        '0xb9298f32a190f5dfce2017f8eb7a3e4e96eedaea987c44b5c4ac95b9747500ba',
        '0xf09d3b71d3a8252fdabcae3f8ca6ea776f406cd3bc19159192354822bf3e6476',
        '0xfc40c353242ff2243bce29b209246a85bcc0e1d9f6ad38b5be4a9c8152c37052'
    ];

    const hash = '0x613e67c23f51c1b4b4b6fb8b94ef128f1c6ca11892965313018ecd611b84c7b7';
    const l2Wallet = new Wallet(process.env.PK, l2ProviderTestnet);

    for (let i=0; i < hashes.length; i++) {
        let receipt = await l1ProviderTestnet.getTransactionReceipt(hashes[i]);
        let l1Receipt = new L1TransactionReceipt(receipt);
        let messages = await l1Receipt.getL1ToL2Messages(l2Wallet);
        let message = messages[0];
        let messageRec = await message.waitForStatus();
        let status = messageRec.status;
        let wasRedeemed = status === L1ToL2MessageStatus.REDEEMED ? true : false;

        if (wasRedeemed) {
            continue;
        } else {
            let tx = await message.redeem(ops);
            await tx.waitForRedeem();
            console.log('redeem: ', hashes[i]);
        }
    }
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

    const storageBeaconAddr = '0x3D722622B82b676580820F3bd0B083837b33B6FA';
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);
    console.log('sBeacon: ', storageBeacon.address);

    // const proxies = await storageBeacon.getAccountsByUser(callerAddr);
    const acc = '0xfA7Bd39bcfa1f5abd2B0A4FAf28E26b8A017fd9F';
    const taskID = await storageBeacon.getTaskID(acc);
    console.log('taskID: ', taskID);
}

// main2();



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

// maint();



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


    // ops.nonce = 450;
    // ops.to = '0x2B75D8312cA463Dea9E80981b5c690f15E94Bd55';
    // ops.value = parseEther('0.01');
    // let tx = await wallet.sendTransaction(ops);
    // let receipt = await tx.wait();
    // console.log('hash: ', receipt.transactionHash);
    // console.log('sent out');

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

// main13();





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
    const storageBeaconAddr = '0xc1093efb13D8fc16916590056869Fc3C70f822EF';
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);
    const test1 = '0xb1188BCb6D5049a6550E260d72FDc33706fdC843';
    const test4 = '0xF4b21C5988B1169343867E620129A6D2eB1Dc67f';
    const test6 = '0x074B21836b849F37F5c91d35fb83f6CB108DE32E';
    
    const taskId = await storageBeacon.getTaskID(test6);
    console.log('taskId: ', taskId);
    
}

// tryUI(); 


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


async function queryRedemption() {
    const redeemedHashesAddr = '0x82ab905466713465B4b7e29afb13853225124b0c';
    const taskId = '0xd8205fbb448f4f449809ef0170ad97b7e889506dcbd5866a29dfaae28063edc5';
    const hash = '0xac2106eb7a949d185e6476c693c0b1ef9e15c7f4f46a687c294865c87cc33499';
    const redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);

    const owner = await redeemedHashes.owner();
    console.log('owner: ', owner);

    let redemptions = await redeemedHashes.getTotalRedemptions();
    console.log('redeemptions pre: ', redemptions);

    // const tx = await redeemedHashes.storeRedemption(taskId, hash, opsL2_2);
    // await tx.wait();

    // redemptions = await redeemedHashes.getTotalRedemptions();
    // console.log('redeemptions post: ', redemptions);
}


// queryRedemption();


async function stressTest() {
    const test1 = '0xDF7B4352021398894dFf5FF16F5a115C85B765Bd'; //0xDF7B4352021398894dFf5FF16F5a115C85B765Bd
    const test4 = '0xc35E21afFD6b03fEc1a7c8c0D5e81EBa0150C60B'; //0xc35E21afFD6b03fEc1a7c8c0D5e81EBa0150C60B
    const test6 = '0xCc7dccCcCfb23750693c08A964DBF561162C5b18'; //0xCc7dccCcCfb23750693c08A964DBF561162C5b18
    const allAccs = [ test1, test4, test6 ];
    const hashes = [];
    let j = 0;
    
    const [ signer ] = await hre.ethers.getSigners();

    for (let i=0; j < 9; i++) {
        if (i >= 3) i = i % 3;
        let acc = allAccs[i];

        ops.to = acc;
        ops.value = parseEther('0.1');

        let tx = await signer.sendTransaction(ops);
        let receipt = await tx.wait();
        let hash = receipt.transactionHash;
        hashes.push(hash);
        console.log('sent');

        j++;
    }

    console.log('hashes: ', hashes);
}

// stressTest();

async function checkMessage() {
    const l2Wallet = new Wallet(process.env.PK, l2ProviderTestnet);
    const hash = '0x070d9f470e597c1bde4f79e177d13cf1c6dfa62016a5fc6f91e73e1b6345f609';

    const receipt = await l1ProviderTestnet.getTransactionReceipt(hash);
    const l1Receipt = new L1TransactionReceipt(receipt);
    const messages = await l1Receipt.getL1ToL2Messages(l2Wallet);
    const message = messages[0];
    const messageRec = await message.waitForStatus();
    const status = messageRec.status;
    const wasRedeemed = status === L1ToL2MessageStatus.REDEEMED ? true : false;

    console.log('was: ', wasRedeemed);
}

// checkMessage();


async function checkPayments() {
    const sBeaconAddr = '0x3D722622B82b676580820F3bd0B083837b33B6FA';
    const sBeacon = await hre.ethers.getContractAt('StorageBeacon', sBeaconAddr);
    const account = '0x61f70468bf14D1a4A1045F433996C4Ca5769E613';

    const payments = await sBeacon.getAccountPayments(account);
    console.log('payments: ', formatEther(payments));

}

// checkPayments();


async function changeImpl() {
    console.log('deploying payme...');
    const [ newPayMeAddr ] = await deployContract('ozPayMe');
    const beaconAddr = '0x2C4131d8760Be227b1E0a545220111208D94678F';
    const beacon = await hre.ethers.getContractAt('ozUpgradeableBeacon', beaconAddr);

    const [ newFactoryAddr, newFactory ] = await deployContract('ProxyFactory');

    await newFactory.initialize(beaconAddr, ops);
    console.log('done with factory initialization...');
    await beacon.upgradeTo(newPayMeAddr, ops);
    console.log('done');
}

// changeImpl();



async function checkUser() {
    const fakeOZLaddr = '0xA69b1945fBaf2419f9BF043dbdc3784a96cBCb49';
    const fakeOZL = await hre.ethers.getContractAt('FakeOZL', fakeOZLaddr);

    const user = await fakeOZL.deadUser();
    console.log('user: ', user);

}

// checkUser();


async function tryMain() {
    const ozDiamondAddr = '0xAdc0DC1af7DF5ff763a6ce132f62B967b57E0951';
    const ozDiamond = await hre.ethers.getContractAt(diamondABI, ozDiamondAddr);

    const volETH = await ozDiamond.getTotalVolumeInETH();
    console.log('ETH vol: ', formatEther(volETH));

    const volUSD = await ozDiamond.getTotalVolumeInUSD();
    console.log('USD vol: ', formatEther(volUSD));

}

// tryMain();




async function deployRest() {
    const storageBeaconAddr = '0xC495aE737ec10cBea741c52F0DcF54856985A621';
    const rolesAuthorityAddr = '0x28D56a92Dfc48467Eb0a0bEcDCbac08d07A52C94';
    const ozERC1967proxyAddr = '0x7c81dDCB564326cb7bB5cb0A1EAbB57d040B43A5';
    const signerAddr = '0x49B7e3BC581DEF1E16645706dcE4AbFce5e61C88';
    const rolesAuthority = await hre.ethers.getContractAt('RolesAuthority', rolesAuthorityAddr)
    const proxyFactory = await hre.ethers.getContractAt('ProxyFactory', ozERC1967proxyAddr)
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr)

    const accountDetails = [
        signerAddr,
        usdtAddrArb,
        defaultSlippage,
        'test account'
    ];

    // console.log('setting...');
    // await rolesAuthority.connect(l1SignerTest).setRoleCapability(1, storageBeaconAddr, '0x0854b85f', true, ops);
    // console.log('set role 1 done...');

    //Creates 1st proxy
    tx = await proxyFactory.createNewProxy(accountDetails, ops);
    receipt = await tx.wait();
    console.log('createNewProxy with hash: ', receipt.transactionHash);
    const newProxyAddr = receipt.logs[0].address;
    console.log('proxy 1: ', newProxyAddr);

    //Gets user's task id
    const taskId = await storageBeacon.getTaskID(newProxyAddr, signerAddr, ops);
    console.log('task id: ', taskId.toString());
}

// deployRest();


async function createAccount() {
    const [ signer ] = await hre.ethers.getSigners();
    const signerAddr = await signer.getAddress();

    const ozERC1967proxyAddr = '0x6E015bc276EBA5eFaCee043A107e26079eFb9FE0';
    const proxyFactory = await hre.ethers.getContractAt('ProxyFactory', ozERC1967proxyAddr);

    const accountDetails = [
        signerAddr,
        usdtAddrArb,
        defaultSlippage,
        'test account'
    ];

    const tx = await proxyFactory.createNewProxy(accountDetails);
    const receipt = await tx.wait();
    console.log('account created: ', receipt.transactionHash);
    console.log('acc: ', receipt.logs[0].address);
}

// createAccount();



async function getL2Data() {
    const fakeOzlAddr = '0x735c782A4578b07d0eCdb3A2c7c26Ea9f73A0c76';
    const abi = ['function deadData() external returns(bytes)'];
    const fakeOZL = await hre.ethers.getContractAt(abi, fakeOzlAddr);

    const data = await fakeOZL.deadData();
    console.log('data: ', data);
}

// getL2Data();


async function getDetails() {
    const fakeOZLaddr = '0x2a7aA5AAd536eBbc7a6C5a3f075388E4aef5b6E3';
    const fakeOZL = await hre.ethers.getContractAt('FakeOZL', fakeOZLaddr);

    const details = await fakeOZL.getDetails();
    console.log('details: ', details);
}

// getDetails();


async function run() {
    const ozlDiamondAddr = '0xAdc0DC1af7DF5ff763a6ce132f62B967b57E0951';
    const ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);
    const ownerAddr = await ozlDiamond.owner();

    const GetEth = await hre.ethers.getContractFactory('GetEth');
    const getEth = await GetEth.deploy(ownerAddr);
    await getEth.deployed();
    console.log('getEth deployed to: ', getEth.address);

    let bal = await hre.ethers.provider.getBalance(ownerAddr);
    console.log('bal pre: ', formatEther(bal));

    const [ signer ] = await hre.ethers.getSigners();
    ops.value = parseEther('1');
    ops.to = ownerAddr;
    let tx = await signer.sendTransaction(ops);
    await tx.wait();
    delete ops.value;
    delete ops.to;

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ownerAddr],
    });

    const ownerSigner = await hre.ethers.provider.getSigner(ownerAddr);
    const facetCut = [[ getEth.address, 0, ['0x4d9b3735'] ]];
    await ozlDiamond.connect(ownerSigner).diamondCut(facetCut, nullAddr, '0x', ops);
    tx = await ozlDiamond.connect(ownerSigner).getFunds(ops);
    await tx.wait();

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [ownerAddr],
    });


    bal = await hre.ethers.provider.getBalance(ownerAddr);
    console.log('bal post: ', formatEther(bal));
}

// run();


async function runReal() {
    const ozlDiamondAddr = '0xAdc0DC1af7DF5ff763a6ce132f62B967b57E0951';
    const ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);
    const ownerAddr = await ozlDiamond.owner();

    const GetEth = await hre.ethers.getContractFactory('GetEth');
    const getEth = await GetEth.deploy(ownerAddr);
    await getEth.deployed();
    console.log('getEth deployed to: ', getEth.address);

    let bal = await hre.ethers.provider.getBalance(ownerAddr);
    console.log('bal pre: ', formatEther(bal));

    //------
    const facetCut = [[ getEth.address, 0, ['0x4d9b3735'] ]];
    await ozlDiamond.diamondCut(facetCut, nullAddr, '0x');
    tx = await ozlDiamond.getFunds();
    await tx.wait();
    //-----

    bal = await hre.ethers.provider.getBalance(ownerAddr);
    console.log('bal post: ', formatEther(bal));
}

// runReal();


async function testOzl() {
    const ozlDiamondAddr = '0xAdc0DC1af7DF5ff763a6ce132f62B967b57E0951';
    const abi = [
        'function exchangeToAccountToken((address,address,uint256,string)) external payable',
        'function owner() external view returns (address owner_)'
    ];
    const ozlDiamond = await hre.ethers.getContractAt(abi, ozlDiamondAddr);
    const ownerAddr = await ozlDiamond.owner();
    const usdtAddr = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';

    const accountDetails = [
        ownerAddr,
        usdtAddr,
        defaultSlippage,
        'test1'
    ];

    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddr);
    let bal = await USDT.balanceOf(ownerAddr);
    console.log('bal pre: ', bal / 10 ** 6);

    const tx = await ozlDiamond.exchangeToAccountToken(accountDetails, {
        value: parseEther('0.0065')
    });
    await tx.wait();
    
    bal = await USDT.balanceOf(ownerAddr);
    console.log('bal post: ', bal / 10 ** 6);
}

// testOzl();


async function checkFail() {
    const data = '0x6d45fc25000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000b1a2bc2ec500000000000000000000000000005cd39390e177fdb18bd8ee3caf7fbbd944549fd7000000000000000000000000000000000000000000000000000000000000002ac4d53d620d2ce9f0de3ec241d4b74dd36a2989a1dac17f958d2ee523a2206206994597c13d831ec7006400000000000000000000000000000000000000000000';
    const ozlDiamondAddr = '0x6E015bc276EBA5eFaCee043A107e26079eFb9FE0';
    const ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);
    const [ signer ] = await hre.ethers.getSigners();
    const signerAddr = '0xc4D53D620d2ce9f0DE3eC241d4B74DD36A2989a1';
    const deployer2 = '0xe738696676571D9b74C81716E4aE797c2440d306';
    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddrArb);

    let bal = await USDT.balanceOf(signerAddr);
    console.log('bal pre: ', bal / 10 ** 6);

    opsL2_2.value = parseEther('1');
    opsL2_2.to = deployer2;
    await signer.sendTransaction(opsL2_2);
    delete opsL2_2.value;
    delete opsL2_2.to;

    //----------
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [deployer2],
    });
    const deployerSigner = await hre.ethers.provider.getSigner(deployer2);

    const ozMiddlewareAddr = '0x894eac76AEFa45886aBEB3beaE37Bcf0A1911295'; 
    await ozlDiamond.connect(deployerSigner).setAuthorizedCaller(ozMiddlewareAddr, true, opsL2_2);
    console.log('middleware authorized...');
    
    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [deployer2],
    });
    //--------
    const ozMiddleAlias = '0x9a5fac76aefa45886abeb3beae37bcf0a19123a6';
    opsL2_2.to = ozMiddleAlias;
    opsL2_2.value = parseEther('1');
    await signer.sendTransaction(opsL2_2);
    delete opsL2_2.value;
    delete opsL2_2.to;

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ozMiddleAlias],
    });    
    const middleAliasSigner = await hre.ethers.provider.getSigner(ozMiddleAlias);

    opsL2_2.to = ozlDiamondAddr;
    opsL2_2.data = data;
    opsL2_2.value = parseEther('0.1');
    const tx = await middleAliasSigner.sendTransaction(opsL2_2);
    const receipt = await tx.wait();
    console.log('tx hash: ', receipt.transactionHash);

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [ozMiddleAlias],
    });

    bal = await USDT.balanceOf(signerAddr);
    console.log('bal post: ', bal / 10 ** 6);

}

// checkFail();


async function approveMiddle() {
    const ozlDiamondAddr = '0x6E015bc276EBA5eFaCee043A107e26079eFb9FE0';
    const ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);    

    const ozMiddlewareAddr = '0x894eac76AEFa45886aBEB3beaE37Bcf0A1911295'; 
    const tx = await ozlDiamond.setAuthorizedCaller(ozMiddlewareAddr, true);
    const receipt = await tx.wait();
    console.log('middle approved: ', receipt.transactionHash);
}

approveMiddle();





