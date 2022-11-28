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
    // const fakeOZLaddr = '0xec0bb67bF1EC382f681f189e3BfCCDa290610a5e';
    // console.log('fakeOZL deployed to: ', fakeOZLaddr);
   
    //Calculate fees on L1 > L2 arbitrum tx 
    // manualRedeem = true; //**** comment in for manualRedeem ****
    const [ gasPriceBid, maxGas ] = await getArbitrumParams(manualRedeem);

    //Deploys Emitter
    const [ emitterAddr, emitter ] = await deployContract('Emitter', '', l1SignerTest);
    // const emitterAddr = '0x72244800aA477667858200Fe17F18F7C086a2017';
    // console.log('Emitter deployed to: ', emitterAddr);
    // const emitter = await hre.ethers.getContractAt('Emitter', emitterAddr);

    //Deploys ozPayMe in mainnet
    const [ ozPaymeAddr ] = await deployContract('ozPayMe', '', l1SignerTest);
    // const ozPaymeAddr = '0x6D0bfaAbA796dBe0ec4A2849375FcB5fdef71912';
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

    await rolesAuthority.setRoleCapability(1, storageBeaconAddr, '0xcb05ce19', true, ops); //saveUserToDetails(address,(address,address,uint256,string))
    console.log('set role 1 done...');
    await rolesAuthority.setRoleCapability(1, storageBeaconAddr, '0xf2034a69', true, ops); //saveTaskId(address proxy_, bytes32 id_)
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

