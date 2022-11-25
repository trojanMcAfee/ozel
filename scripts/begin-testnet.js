const { formatEther } = require('ethers/lib/utils.js');
const { 
    getArbitrumParams,
    getFakeOZLVars,
    deployContract,
    getInitSelectors
 } = require('./helpers-eth.js');

const { 
    pokeMeOpsAddr,
    usdtAddrArb,
    usdcAddr,
    inbox,
    signerX,
    l2Signer,
    l1Signer,
    wethAddr,
    defaultSlippage,
    gelatoAddr,
    ETH,
    swapRouterUniAddr,
    poolFeeUni,
    chainlinkAggregatorAddr,
    ops,
    testnetReceiver,
    myReceiver,
    signerTestnet,
    factoryABI,
    l1SignerTestnet,
    l2SignerTestnet,
    renBtcAddr,
    mimAddr,
    fraxAddr,
    wbtcAddr,
    l1ProviderTestnet,
    opsL2
 } = require('./state-vars.js');


 


// async function deployContract(contractName, signer, constrArgs) {
//     if (contractName === 'StorageBeacon') {
//         const [ libCommonAddr ] = await deployContract('LibCommon', signer);
//         Contract = await hre.ethers.getContractFactory(contractName, {
//             libraries: {
//                 LibCommon: libCommonAddr
//             }
//         });
//     } else {
//         Contract = await hre.ethers.getContractFactory(contractName);
//     }

//     let contract;
//     let var1, var2, var3, var4;

//     switch(contractName) {
//         case 'UpgradeableBeacon':
//             contract = await Contract.connect(signer).deploy(constrArgs, ops);
//             break;
//         case 'ozUpgradeableBeacon':
//         case 'ozERC1967Proxy':
//         case 'RolesAuthority':
//         case 'FakeOZL':
//             let gas = ops;
//             ([ var1, var2 ] = constrArgs);
//             if (contractName === 'FakeOZL') gas = opsL2;
//             contract = await Contract.connect(signer).deploy(var1, var2, gas);
//             break;
//         case 'StorageBeacon':
//             ([ var1, var2, var3, var4 ] = constrArgs);
//             contract = await Contract.connect(signer).deploy(var1, var2, var3, var4, ops);
//             break;
//         default:
//             contract = await Contract.connect(signer).deploy(ops);
//     }

//     await contract.deployed();
//     console.log(`${contractName} deployed to: `, contract.address);

//     return [
//         contract.address,
//         contract
//     ];
// }


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
        defaultSlippage,
        'test account'
    ];
    
    let constrArgs = [ receiver, getFakeOZLVars() ]; 
    
    //Deploys the fake OZL on arbitrum testnet 
    const [ fakeOZLaddr ] = await deployContract('FakeOZL', constrArgs, l2SignerTest); //fake OZL address in arbitrum
    // const fakeOZLaddr = '0xD1ee938A82F6cAa151056fd160b7C523AE029d8F';
    // console.log('fakeOZL deployed to: ', fakeOZLaddr);
   
    //Calculate fees on L1 > L2 arbitrum tx 
    // manualRedeem = true; //**** comment in for manualRedeem ****
    const [ gasPriceBid, maxGas ] = await getArbitrumParams(manualRedeem);

    //Deploys Emitter
    const [ emitterAddr, emitter ] = await deployContract('Emitter', '', l1SignerTest);
    // const emitterAddr = '0x2aA80df7466fD490E2ad3DE9BD2E5462d76E62c9';
    // console.log('Emitter deployed to: ', emitterAddr);
    // const emitter = await hre.ethers.getContractAt('Emitter', emitterAddr);

    //Deploys ozPayMe in mainnet
    const [ ozPaymeAddr ] = await deployContract('ozPayMe', '', l1SignerTest);
    // const ozPaymeAddr = '0x78c862d984233a9273e2Bcf23c2b821d9b32113a';
    // console.log('ozPayMe deployed to: ', ozPaymeAddr);

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

    const eMode = [
        swapRouterUniAddr,
        chainlinkAggregatorAddr,
        poolFeeUni,
        wethAddr,
        usdcAddr
    ];


    const tokensDatabase = [
        renBtcAddr,
        mimAddr,
        usdcAddr,
        fraxAddr,
        usdtAddrArb,
        wbtcAddr
    ];

    constrArgs = [
        fxConfig,
        eMode,
        tokensDatabase,
        getInitSelectors(),
        gasPriceBid
    ]; 

    const [ storageBeaconAddr, storageBeacon ] = await deployContract('StorageBeacon', constrArgs, l1SignerTest);

    //Deploys UpgradeableBeacon
    constrArgs = [
        ozPaymeAddr,
        storageBeaconAddr
    ];

    const [ beaconAddr, beacon ] = await deployContract('ozUpgradeableBeacon', constrArgs, l1SignerTest); 
    await storageBeacon.storeBeacon(beaconAddr, ops);
    console.log('beacon stored in StorageBeacon...')
    await emitter.storeBeacon(beaconAddr, ops);
    console.log('beacon stored in Emitter...');

    //Deploys ProxyFactory
    const [proxyFactoryAddr] = await deployContract('ProxyFactory', '', l1SignerTest);

    //Deploys ozERC1967Proxy
    constrArgs = [
        proxyFactoryAddr,
        '0x'
    ];

    const [ ozERC1967proxyAddr ] = await deployContract('ozERC1967Proxy', constrArgs, l1SignerTest);

    const proxyFactory = await hre.ethers.getContractAt(factoryABI, ozERC1967proxyAddr);
    let tx = await proxyFactory.connect(l1SignerTest).initialize(beaconAddr, ops);
    let receipt = await tx.wait();
    console.log('initialize with hash: ', receipt.transactionHash);

    //Deploys RedeemedHashes contract in L2
    const [ redeemedHashesAddr, redeemedHashes ] = await deployContract('RedeemedHashes', '', l2SignerTest); 

    //Deploys Auth
    constrArgs = [ 
        signerAddr,
        beaconAddr
    ];

    const [ rolesAuthorityAddr, rolesAuthority ] = await deployContract('RolesAuthority', constrArgs, l1SignerTest);
    await beacon.setAuth(rolesAuthorityAddr, ops);
    console.log('set auth done...');

    //Set ERC1967Proxy to role 1 and gives it authority to call the functions in StorageBeacon
    await rolesAuthority.setUserRole(ozERC1967proxyAddr, 1, true, ops);
    console.log('set user role done...');

    await rolesAuthority.setRoleCapability(1, storageBeaconAddr, '0xcb05ce19', true); //saveUserToDetails(address,(address,address,uint256,string))
    console.log('set role 1 done...');
    await rolesAuthority.setRoleCapability(1, storageBeaconAddr, '0xf2034a69', true); //saveTaskId(address proxy_, bytes32 id_)
    console.log('set role 2 done...');

    //Creates 1st proxy
    tx = await proxyFactory.connect(l1SignerTest).createNewProxy(userDetails, ops);
    receipt = await tx.wait();
    console.log('createNewProxy with hash: ', receipt.transactionHash);
    const newProxyAddr = receipt.logs[0].address;
    console.log('proxy 1: ', newProxyAddr);

    //Gets user's task id
    const taskId = await storageBeacon.getTaskID(newProxyAddr, ops);
    console.log('task id: ', taskId.toString());

    return [
        storageBeacon,
        emitterAddr,
        newProxyAddr,
        redeemedHashes,
        proxyFactory,
        userDetails
    ];

}

deployTestnet();



 
module.exports = {
    deployTestnet
};

