const { ethers, providers, Wallet } = require("ethers");
const { parseEther, formatEther, defaultAbiCoder: abiCoder, keccak256 } = ethers.utils;
const { deploy } = require('./deploy.js');
// const { Bridge } = require('arb-ts');
const { L1TransactionReceipt, L1ToL2MessageStatus } = require('@arbitrum/sdk');
const { hexDataLength } = require('@ethersproject/bytes');
require('dotenv').config();

const {
    balanceOfOZL, 
    transferOZL, 
    withdrawShareOZL, 
    getVarsForHelpers,
    sendETH,
    getCalldata,
    getCalldata2
} = require('./helpers-arb.js');

const { getArbitrumParams } = require('./helpers-eth.js');

const { 
    chainId,
    pokeMeOpsAddr,
    hopBridge,
    usdtAddrArb,
    wbtcAddr,
    renBtcAddr,
    usdcAddr,
    mimAddr,
    fraxAddr,
    inbox,
    signerX,
    l2Provider,
    l2Signer,
    l1Signer,
    wethAddr,
    defaultSlippage,
    gelatoAddr,
    ETH,
    swapRouterUniAddr,
    poolFeeUni,
    nullAddr,
    chainlinkAggregatorAddr,
    l1ProviderTestnet,
    l2ProviderTestnet,
    ops,
    testnetReceiver,
    myReceiver,
    signerTestnet,
    factoryABI,
    l1SignerTestnet,
    l2SignerTestnet
 } = require('./state-vars.js');




async function deployContract(contractName, signer, constrArgs) {
    const Contract = await hre.ethers.getContractFactory(contractName);
    let contract;
    let var1, var2, var3, var4;

    switch(contractName) {
        case 'UpgradeableBeacon':
            contract = await Contract.connect(signer).deploy(constrArgs, ops);
            break;
        case 'FakeOZL':
            ([ var1 ] = constrArgs);
            contract = await Contract.connect(signer).deploy(var1, ops);
            break;
        case 'ozUpgradeableBeacon':
        case 'ozERC1967Proxy':
        case 'RolesAuthority':
            ([ var1, var2 ] = constrArgs);
            contract = await Contract.connect(signer).deploy(var1, var2, ops);
            break;
        case 'StorageBeacon':
            ([ var1, var2, var3, var4 ] = constrArgs);
            contract = await Contract.connect(signer).deploy(var1, var2, var3, var4, ops);
            break;
        default:
            contract = await Contract.connect(signer).deploy(ops);
    }

    await contract.deployed();
    console.log(`${contractName} deployed to: `, contract.address);

    return [
        contract.address,
        contract
    ];
}




async function manualRedeem() {
    const txHash = '0xa5feb8901205b12c4a586ceec36b39356fb6b50f99d01de1d18ab3835dd359bb';
    const l1Provider = new providers.JsonRpcProvider(process.env.RINKEBY);
    const l2Provider = new providers.JsonRpcProvider(process.env.ARB_TESTNET);
    const l2Wallet = new Wallet(process.env.PK, l2Provider);

    const receipt = await l1Provider.getTransactionReceipt(txHash);
    const l1Receipt = new L1TransactionReceipt(receipt);
    const message = await l1Receipt.getL1ToL2Message(l2Wallet);
    const status = (await message.waitForStatus()).status;

    if (status === L1ToL2MessageStatus.REDEEMED) {
        console.log(`L2 retryable txn is already executed 🥳 ${message.l2TxHash}`)
        return
      } else {
        console.log(
          `L2 retryable txn failed with status ${L1ToL2MessageStatus[status]}`
        )

        await message.redeem({
            gasLimit: ethers.BigNumber.from('5000000'),
            gasPrice: ethers.BigNumber.from('40134698068')
        });

        console.log(
            'The L2 side of your transaction is now execeuted 🥳 :',
            message.l2TxHash
          )
      }

}

// manualRedeem();


async function redeemHashes() {
    const l2Wallet = new Wallet(process.env.PK, l2ProviderTestnet);

    const RedeemedHashes = await hre.ethers.getContractFactory('RedeemedHashes');
    const redeemedHashes = await RedeemedHashes.connect(l2Wallet).deploy();
    await redeemedHashes.deployed();
    console.log('redeemedHashes deployed to: ', redeemedHashes.address);
}

// redeemHashes();


async function createProxys() {
    const signerAddr = await signerX.getAddress();
    console.log('signer address: ', signerAddr);

    const userDetails = [
        signerAddr,
        usdtAddrArb,
        defaultSlippage
    ];
    const ozERC1967proxyAddr = '0xfFC6fA60fC22f593Bc0eB9b08bdd36c062f3dA0E';
    const storageBeaconAddr = '0x6A919AF1d607d294205c1EAd607ED0B0ce8079fd';
    const proxyFactory = await hre.ethers.getContractAt(factoryABI, ozERC1967proxyAddr);
    const storageBeacon = await hre.ethers.getContractAt('StorageBeacon', storageBeaconAddr);

    for (let j=0; j < 3; j++) {
        tx = await proxyFactory.createNewProxy(userDetails, ops);
        await tx.wait();
    }

    const proxies = await storageBeacon.getProxyByUser(signerAddr); 
    for (let i=0; i < proxies.length; i++) {
        console.log(`proxy #${i+1}: `, proxies[i]);
    }
}

// createProxys();



//Deploys ozPayMe in mainnet and routes ETH to Manager (OZL) in Arbitrum
async function deployTestnet(testSigner = false, manualRedeem = false) { 
    let signer, l1SignerTest, l2SignerTest, receiver;

    if (testSigner) {
        signer = signerTestnet;
        l1SignerTest = l1SignerTestnet;
        l2SignerTest = l2SignerTestnet;
        receiver = testnetReceiver;
    } else {
        signer = signerX;
        l1SignerTest = l1Signer;
        l2SignerTest = l2Signer;
        receiver = myReceiver;
    }

    const signerAddr = await signer.getAddress();
    console.log('signer address: ', signerAddr);

    const userDetails = [
        signerAddr,
        usdtAddrArb,
        defaultSlippage
    ];
    
    let constrArgs = [receiver];
    
    //Deploys the fake OZL on arbitrum testnet 
    const [ fakeOZLaddr ] = await deployContract('FakeOZL', l2SignerTest, constrArgs); //fake OZL address in arbitrum
    // const fakeOZLaddr = '0x0FDe6518Ee375984944D28962AF32D1d7084736c';
    // console.log('fakeOZL deployed to: ', fakeOZLaddr);
   
    //Calculate fees on L1 > L2 arbitrum tx 
    manualRedeem = true; //**** comment in for manualRedeem ****
    let [ maxSubmissionCost, gasPriceBid, maxGas, autoRedeem ] = await getArbitrumParams(userDetails, manualRedeem);

    //Deploys Emitter
    const [ emitterAddr, emitter ] = await deployContract('Emitter', l1SignerTest);

    //Deploys ozPayMe in mainnet
    const [ ozPaymeAddr ] = await deployContract('ozPayMe', l1SignerTest);

    //Deploys StorageBeacon
    const fxConfig = [
        inbox, 
        pokeMeOpsAddr,
        fakeOZLaddr,
        emitterAddr,
        gelatoAddr, 
        ETH,
        maxGas
    ];

    const varConfig = [
        maxSubmissionCost,
        gasPriceBid,
        autoRedeem
    ];

    const eMode = [
        swapRouterUniAddr,
        chainlinkAggregatorAddr,
        poolFeeUni,
        wethAddr,
        usdcAddr
    ];


    const tokensDatabase = [
        usdtAddrArb
    ];

    constrArgs = [
        fxConfig,
        varConfig,
        eMode,
        tokensDatabase
    ]; 

    const [ storageBeaconAddr, storageBeacon ] = await deployContract('StorageBeacon', l1SignerTest, constrArgs);

    //Deploys UpgradeableBeacon
    constrArgs = [
        ozPaymeAddr,
        storageBeaconAddr
    ];

    const [ beaconAddr, beacon ] = await deployContract('ozUpgradeableBeacon', l1SignerTest, constrArgs); 
    await storageBeacon.storeBeacon(beaconAddr);
    await emitter.storeBeacon(beaconAddr);

    //Deploys ProxyFactory
    const [proxyFactoryAddr] = await deployContract('ProxyFactory', l1SignerTest);

    //Deploys ozERC1967Proxy
    constrArgs = [
        proxyFactoryAddr,
        '0x'
    ];

    const [ ozERC1967proxyAddr ] = await deployContract('ozERC1967Proxy', l1SignerTest, constrArgs);

    const proxyFactory = await hre.ethers.getContractAt(factoryABI, ozERC1967proxyAddr);
    let tx = await proxyFactory.connect(l1SignerTest).initialize(beaconAddr);
    let receipt = await tx.wait();
    console.log('initialize with hash: ', receipt.transactionHash);

    //Deploys RedeemedHashes contract in L2
    const [ redeemedHashesAddr ] = await deployContract('RedeemedHashes', l2SignerTest);

    //Deploys Auth
    constrArgs = [
        signerAddr,
        beaconAddr
    ];

    const [ rolesAuthorityAddr, rolesAuthority ] = await deployContract('RolesAuthority', l1SignerTest, constrArgs);
    await beacon.setAuth(rolesAuthorityAddr, ops);

    //Set ERC1967Proxy to role 1 and gives it authority to call the functions in StorageBeacon
    await rolesAuthority.setUserRole(ozERC1967proxyAddr, 1, true, ops);

    await rolesAuthority.setRoleCapability(1, storageBeaconAddr, '0x74e0ea7a', true, ops); //issueUserID(UserConfig memory userDetails_)
    await rolesAuthority.setRoleCapability(1, storageBeaconAddr, '0x68e540e5', true, ops); //saveUserProxy(address sender_, address proxy_)
    await rolesAuthority.setRoleCapability(1, storageBeaconAddr, '0xf2034a69', true, ops); //saveTaskId(address proxy_, bytes32 id_)

    //Creates 1st proxy
    tx = await proxyFactory.connect(l1SignerTest).createNewProxy(userDetails, ops);
    receipt = await tx.wait();
    console.log('createNewProxy with hash: ', receipt.transactionHash);
    const newProxyAddr = (await storageBeacon.getProxyByUser(signerAddr))[0].toString(); 
    console.log('proxy 1: ', newProxyAddr);

    //Gets user's task id
    const taskId = await storageBeacon.getTaskID(newProxyAddr, ops);
    console.log('task id: ', taskId.toString());

    //**** TRIGGER for Gelato *******/
    // await sendTx(newProxyAddr, true, 'Sending ETH');

    return [
        storageBeaconAddr,
        newProxyAddr,
        redeemedHashesAddr
    ];

}

deployTestnet();


async function simulateDeployment() {
    const storageBeaconAddr = '0xaF05BC01645d87Ea822C5ebD397CB3BEBe900502';
    const newProxyAddr = '0x0b2f0a7655E3a48D4CFfe09e65123B2A90bAd0CB';
    const redeemedHashesAddr = '0x87619bEb967f96534C616Cc3147dD3d1907c1C74';

    return [
        storageBeaconAddr,
        newProxyAddr,
        redeemedHashesAddr
    ];
}



// .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
  



module.exports = {
    deployTestnet,
    simulateDeployment
};

