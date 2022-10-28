const { getArbitrumParams } = require('./helpers-eth.js');

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
    // const fakeOZLaddr = '0xd12E835f658C93E5A527b2f81fee0014881d4726';
    // console.log('fakeOZL deployed to: ', fakeOZLaddr);
   
    //Calculate fees on L1 > L2 arbitrum tx 
    // manualRedeem = true; //**** comment in for manualRedeem ****
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
    const [ redeemedHashesAddr, redeemedHashes ] = await deployContract('RedeemedHashes', l2SignerTest);

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

