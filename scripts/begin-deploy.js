const { formatEther, formatUnits } = require('ethers/lib/utils.js');
const { 
    getArbitrumParams,
    getFakeOZLVars
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

//  const { deployContract } = require('./begin-testnet');




 async function deploy() {

    // const [ ozPaymeAddr ] = await deployContract('ozPayMe', l1SignerTest);

    ops.nonce = 332;

    const Contract = await hre.ethers.getContractFactory('ozPayMe');
    const contract = await Contract.deploy(ops);
    await contract.deployed();
    console.log('contract deployed to: ', contract.address);


 }

//  deploy();


 async function maint() {

    const provider = new ethers.providers.JsonRpcProvider(process.env.GOERLI);
    const wallet = await new ethers.Wallet(process.env.PK, provider);

    const gas = (await l1ProviderTestnet.getGasPrice()).toString();
    console.log('gas: ', formatUnits(gas, 'gwei'));

    let count = await provider.getTransactionCount('0x0E743a1E37D691D8e52F7036375F3D148B4116ba', 'pending');
    console.log('count pen: ', Number(count));

    count = await provider.getTransactionCount('0x0E743a1E37D691D8e52F7036375F3D148B4116ba', 'latest');
    console.log('count: ', Number(count));

}

// maint();


async function query() {

    const sBeaconAddr = '0x53548E9698BC27eCfEd86dbC1Bd47d827912CB75';
    const sBeacon = await hre.ethers.getContractAt('StorageBeacon', sBeaconAddr);
    console.log('sBeacon in: ', sBeacon.address);

    const tokens = await sBeacon.getTokenDatabase();
    console.log('tokens: ', tokens);

}

query();