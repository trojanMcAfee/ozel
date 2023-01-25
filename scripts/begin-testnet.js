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
    mimAddr,
    fraxAddr,
    wbtcAddr,
    l1ProviderTestnet,
    opsL2
 } = require('./state-vars.js');



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

    const accountDetails = [
        signerAddr,
        usdtAddrArb,
        defaultSlippage,
        'test account'
    ];
    
    let constrArgs = [ receiver, getFakeOZLVars() ]; 
    
    //Deploys the fake OZL on arbitrum testnet 
    const [ ozDiamondAddr ] = await deployContract('FakeOZL', constrArgs, l2SignerTest); 
   
    //Calculate fees on L1 > L2 arbitrum tx 
    manualRedeem = true; //**** comment in for manualRedeem ****
    const [ gasPriceBid, maxGas ] = await getArbitrumParams(manualRedeem);

    //Deploys Emitter
    const [ emitterAddr, emitter ] = await deployContract('Emitter', '', l1SignerTest);

    //Deploys ozPayMe in mainnet
    constrArgs = [
        pokeMeOpsAddr,
        gelatoAddr,
        inbox,
        emitterAddr,
        ozDiamondAddr,
        maxGas
    ];

    const [ ozPaymeAddr ] = await deployContract('ozPayMe', constrArgs, l1SignerTest);

    //Deploys StorageBeacon
    const eMode = [
        swapRouterUniAddr,
        chainlinkAggregatorAddr,
        poolFeeUni,
        wethAddr,
        usdcAddr
    ];

    const tokensDatabase = [
        mimAddr,
        usdcAddr,
        fraxAddr,
        usdtAddrArb,
        wbtcAddr
    ];

    constrArgs = [
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
    constrArgs = [ pokeMeOpsAddr, beaconAddr ]; 

    const [ proxyFactoryAddr ] = await deployContract('ProxyFactory', constrArgs, l1SignerTest);

    //Deploys ozERC1967Proxy
    constrArgs = [
        proxyFactoryAddr,
        '0x'
    ];

    const [ ozERC1967proxyAddr ] = await deployContract('ozERC1967Proxy', constrArgs, l1SignerTest); 

    const proxyFactory = await hre.ethers.getContractAt(factoryABI, ozERC1967proxyAddr);
    let tx = await proxyFactory.connect(l1SignerTest).initialize(ops);
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

    await rolesAuthority.setRoleCapability(1, storageBeaconAddr, '0x0854b85f', true, ops); //multiSave(address,(address,address,uint256,string),bytes32)
    console.log('set role 1 done...');

    //Creates 1st proxy
    tx = await proxyFactory.connect(l1SignerTest).createNewProxy(accountDetails, ops);
    receipt = await tx.wait();
    console.log('createNewProxy with hash: ', receipt.transactionHash);
    const newProxyAddr = receipt.logs[0].address;
    console.log('proxy 1: ', newProxyAddr);

    //Gets user's task id
    const taskId = await storageBeacon.getTaskID(newProxyAddr, signerAddr, ops);
    console.log('task id: ', taskId.toString());

    return [
        storageBeacon,
        emitterAddr,
        newProxyAddr,
        redeemedHashes,
        proxyFactory,
        accountDetails
    ];

}

deployTestnet();



 
module.exports = {
    deployTestnet
};

