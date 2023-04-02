const { 
    pokeMeOpsAddr,
    usdtAddrArb,
    usdcAddr,
    inbox,
    wethAddr,
    gelatoAddr,
    ETH,
    swapRouterUniAddr,
    poolFeeUni,
    chainlinkAggregatorAddr,
    factoryABI,
    myReceiver,
    ops,
    fraxAddr,
    proxyABIeth,
    opsL2,
    mimAddr,
    wbtcAddr,
    defaultSlippage,
    opsL2_2,
    diamondABI
} = require('./state-vars.js');

const { 
    getArbitrumParams,
    getFakeOZLVars,
    deployContract,
    getInitSelectors,
    sendETH,
    activateProxyLikeOps
 } = require('./helpers-eth.js');

const { 
    activateProxyLikeOpsL2, 
    getAccData,
    deployV1_2
} = require('./helpers-arb');

const { parseEther, formatEther } = require('ethers/lib/utils');



async function main() {
    const redeemedHashesAddr = '0xD617AfE3D42Ca8e5a1514A90Ec14020E85993079';
    const redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);
    const newOwner = '0x366D9C2cf28A2A5A4d80879964AF1EBb7D7dB086';

    let owner = await redeemedHashes.owner();
    console.log('owner old: ', owner);

    const tx = await redeemedHashes.transferOwnership(newOwner);
    const receipt = await tx.wait();
    console.log('done: ', receipt.transactionHash);

    owner = await redeemedHashes.owner();
    console.log('owner new: ', owner);

}

// main();


async function fixSlippage() {
    const deployer2 = '0xe738696676571D9b74C81716E4aE797c2440d306';
    const beaconAddr = '0xB318dE9d697933bF9BF32861916A338B3e7AbD5a';
    const emitterAddr = '0xd986Ac35f3aD549794DBc70F33084F746b58b534';
    const ozMiddlewareAddr = '0x3164a03cDbbf607Db19a366416113f7f74341B56';
    const beacon = await hre.ethers.getContractAt('ozUpgradeableBeacon', beaconAddr);
    const [ signer ] = await hre.ethers.getSigners();

    ops.value = parseEther('3');
    ops.to = deployer2;
    await signer.sendTransaction(ops);
    delete ops.value;
    delete ops.to;

    let impl = await beacon.implementation();
    console.log('impl pre: ', impl);
    //--------

    const constrArgs = [
        pokeMeOpsAddr,
        gelatoAddr,
        emitterAddr,
        ozMiddlewareAddr
    ];

    const [ newPaymeAddr ] = await deployContract('ozPayMe', constrArgs); //remember to get rid of ops
    //------

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [deployer2],
    });

    const deployerSigner = await hre.ethers.provider.getSigner(deployer2);
    let tx = await beacon.connect(deployerSigner).upgradeTo(newPaymeAddr);
    await tx.wait();

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [pokeMeOpsAddr],
    });

    impl = await beacon.implementation();
    console.log('impl post: ', impl);
    console.log('UPGRADE DONE *****');

    //----- UPGRADE DONE --------
}


// fixSlippage();


async function fixSlippageMainnet() {
    const deployer2 = '0xe738696676571D9b74C81716E4aE797c2440d306';
    const beaconAddr = '0xB318dE9d697933bF9BF32861916A338B3e7AbD5a';
    const emitterAddr = '0xd986Ac35f3aD549794DBc70F33084F746b58b534';
    const ozMiddlewareAddr = '0x3164a03cDbbf607Db19a366416113f7f74341B56';
    const beacon = await hre.ethers.getContractAt('ozUpgradeableBeacon', beaconAddr);

    const constrArgs = [
        pokeMeOpsAddr,
        gelatoAddr,
        emitterAddr,
        ozMiddlewareAddr
    ];

    const [ newPaymeAddr ] = await deployContract('ozPayMe', constrArgs);

    let impl = await beacon.implementation();
    console.log('impl pre: ', impl);

    let tx = await beacon.upgradeTo(newPaymeAddr);
    const receipt = await tx.wait();
    console.log('Upgrade done with: ', receipt.transactionHash);

    impl = await beacon.implementation();
    console.log('impl post: ', impl);

}

// fixSlippageMainnet();





async function fixSlippageGoerli() {
    const beaconAddr = '0x6A5d86a06a3ba16ee6314E225478d5679559075a';
    const beacon = await hre.ethers.getContractAt('ozUpgradeableBeacon', beaconAddr);
    const newOwner = '0xe7858016db2548359ef3a8212AcD5b08D9BAe8d8';
    const emitterAddr = '0x3b5f3a90fb6179Ae2471497cb83f3bF8F866aaaD';
    const ozMiddlewareAddr = '0x938Dc5298D505B06B5Ba542e461c665923eD0519';

    const constrArgs = [
        pokeMeOpsAddr,
        gelatoAddr,
        emitterAddr,
        ozMiddlewareAddr
    ];

    console.log('deploying...');
    const [ newPaymeAddr ] = await deployContract('ozPayMe', constrArgs);
    let impl = await beacon.implementation();
    console.log('impl old: ', impl);

    let tx = await beacon.upgradeTo(newPaymeAddr);
    let receipt = await tx.wait();
    console.log('Beacon upgraded: ', receipt.transactionHash);
    impl = await beacon.implementation();
    console.log('impl new: ', impl);

}

// fixSlippageGoerli();


async function checkSelector() {
    const sBeaconAddr = '0x53A64483Ad7Ca5169F26A8f796B710aCAdEb8f0C';
    const sBeacon = await hre.ethers.getContractAt('StorageBeacon', sBeaconAddr);
    const selector = '0x7af1d3ed';

    const is = await sBeacon.isSelectorAuthorized(selector);
    console.log('is true: ', is);

}

// checkSelector();


async function checkSelector2() {
    const [signer] = await hre.ethers.getSigners();
    const signerAddr = await signer.getAddress();
    const accountDetails = [
        signerAddr,
        usdtAddrArb,
        defaultSlippage,
        'test'
    ];
    const selector = '0xe7f68342';

    const ozERC1967proxyAddr = '0x44e2e47039616b8E69dC153add52C415f22Fab2b';
    const factory = await hre.ethers.getContractAt('ProxyFactory', ozERC1967proxyAddr);
    const sBeaconAddr = '0x53A64483Ad7Ca5169F26A8f796B710aCAdEb8f0C';
    const sBeacon = await hre.ethers.getContractAt('StorageBeacon', sBeaconAddr);
    const deployer2 = '0xe738696676571D9b74C81716E4aE797c2440d306';

    let tx = await factory.createNewProxy(accountDetails);
    await tx.wait();
    
    const [ proxies, names ] = await sBeacon.getAccountsByUser(signerAddr);
    const account = proxies[0].toString();
    console.log('acc: ', account);


    let balance = await hre.ethers.provider.getBalance(account);
    console.log('bal pre: ', formatEther(balance));

    tx = await signer.sendTransaction({
        to: account,
        value: parseEther('1')
    });
    let receipt = await tx.wait();
    console.log('tx sent: ', receipt.transactionHash);

    balance = await hre.ethers.provider.getBalance(account);
    console.log('bal post: ', formatEther(balance));

    await signer.sendTransaction({
        gasLimit: ethers.BigNumber.from('30000000'),
        gasPrice: ethers.BigNumber.from('50134698068'),
        value: parseEther('3'),
        to: deployer2
    });

    balance = await signer.getBalance();
    console.log('eth bal pre: ', formatEther(balance));

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [deployer2],
    });
    const depSigner = await hre.ethers.provider.getSigner(deployer2);

    tx = await sBeacon.connect(depSigner).addAuthorizedSelector(selector);
    await tx.wait();

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [deployer2],
    });

    ops.to = account;
    ops.data = selector;
    tx = await signer.sendTransaction(ops);
    await tx.wait();

    
    balance = await signer.getBalance();
    console.log('eth bal post: ', formatEther(balance));
    

}

// checkSelector2();


async function fixLast() {

    const selector = '0xe7f68342';
    const sBeaconAddr = '0x53A64483Ad7Ca5169F26A8f796B710aCAdEb8f0C';
    const sBeacon = await hre.ethers.getContractAt('StorageBeacon', sBeaconAddr);

    let is = await sBeacon.isSelectorAuthorized(selector);
    console.log('is pre: ', is);

    tx = await sBeacon.addAuthorizedSelector(selector);
    await tx.wait();

    is = await sBeacon.isSelectorAuthorized(selector);
    console.log('is post: ', is);

}

// fixLast();


async function createAccount() {
    const [signer] = await hre.ethers.getSigners();
    const signerAddr = await signer.getAddress();

    const accountDetails = [
        signerAddr,
        usdtAddrArb,
        defaultSlippage,
        'test'
    ];

    const proxyFactoryAddr = '0x773241cbB10a1e789347AA170C2790D2c620593D';
    const factory = await hre.ethers.getContractAt('ozProxyFactoryFacet', proxyFactoryAddr);
    console.log('factory in : ', factory.address);

    let tx = await factory.createNewProxy(accountDetails, opsL2_2);
    let receipt = await tx.wait();
    console.log('account created: ', receipt.transactionHash);
    console.log('acc: ', receipt.events[0].address);

}

// createAccount();


async function checkImpl() {
    const factoryAddr = '0x295a2a9e3F9934d8fE11c3b5473B279c0538d56D';
    const factory = await hre.ethers.getContractAt('ozProxyFactoryTest', factoryAddr);
    const acc = '0xe4915a94FC428E5a025b887Dfcc3b77899CB1F2E';

    const id = await factory.getTaskID(acc);
    console.log('id: ', id);
}

// checkImpl();


async function getTask() {
    const factoryAddr = '0x773241cbB10a1e789347AA170C2790D2c620593D';
    const factory = await hre.ethers.getContractAt('ozProxyFactoryTest', factoryAddr);
    const account = '0x2e54c7c2B5519B1aFe88779fe63B38694EF7C003';

    const id = await factory.getTaskID(account);
    console.log('id: ', id);
}

// getTask();


async function debugAcc() {
    const signerAddr = '0x2B75D8312cA463Dea9E80981b5c690f15E94Bd55';
    const account = '0x2e54c7c2B5519B1aFe88779fe63B38694EF7C003';
    const factoryAddr = '0x773241cbB10a1e789347AA170C2790D2c620593D';
    const accData = getAccData(signerAddr, usdtAddrArb, defaultSlippage);

    let balance = await hre.ethers.provider.getBalance(account);
    console.log('bal pre: ', formatEther(balance));

    await activateProxyLikeOpsL2(account, factoryAddr, accData)

    balance = await hre.ethers.provider.getBalance(account);
    console.log('bal post: ', formatEther(balance));
}

// debugAcc();


async function getTaskId() {
    const sBeaconAddr = '0x53A64483Ad7Ca5169F26A8f796B710aCAdEb8f0C';
    const sBeacon = await hre.ethers.getContractAt('StorageBeacon', sBeaconAddr);
    const account = '0x0B9686a6d4Fc5e87328d34864898b9cD207bE9A4';
    const owner = '0x86db38631eE3552b36aB8F2A6dD815a0F5B5d95f';

    const id = await sBeacon.getTaskID(account, owner);
    console.log('id: ', id);

}

// getTaskId();


async function deployUpgrade() {
    const ozlDiamondAddr = '0x7D1f13Dd05E6b0673DC3D0BFa14d40A74Cfa3EF2';
    const ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);
    const testAcc2 = '0x1bCda80Ec23bd4fC14E13960123E6f652Ff726E3';

    // await deployV1_2(ozlDiamond, true);

    const tokens = await ozlDiamond.getAccountsByUser(testAcc2);
    console.log('accs: ', tokens);
}

// deployUpgrade();


async function getAccDetails() {
    const accountAddr = '0x4d55f73a64b1d9f096a598f60e8D4eCb5bCE18A8';
    const account = await hre.ethers.getContractAt('ozMiddlewareL2', accountAddr);

    const deets = await account.getDetails();
    console.log('deets: ', deets);

}

// getAccDetails();


async function modifyRevenue() {
    const ozlDiamondAddr = '0x7D1f13Dd05E6b0673DC3D0BFa14d40A74Cfa3EF2';
    const ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);


}


async function checkAirdrop() {
    const abi = ['function claimableTokens(address) external view returns(uint256)'];
    const arbAddr = '0x67a24CE4321aB3aF51c2D0a4801c3E111D88C9d9';
    const arb = await hre.ethers.getContractAt(abi, arbAddr);
    const addr = '0x9c1241606DafbAeE46dFAdF3B0deCd0B653f342e';

    const addrs = [
        '0xC486c3013241cC11fc05B2e023BA74E12758Cec5',
        '0xbe22F29504bFf7Dda16d1751aEAbCC5678b0D36B',
        '0xe738696676571D9b74C81716E4aE797c2440d306',
        '0xc4D53D620d2ce9f0DE3eC241d4B74DD36A2989a1',
        '0x9c1241606DafbAeE46dFAdF3B0deCd0B653f342e',
        '0x8f3e65A14999Ad0F26b65ad695749e3Ccf3261b2',
        '0x366D9C2cf28A2A5A4d80879964AF1EBb7D7dB086',
        '0x1bCda80Ec23bd4fC14E13960123E6f652Ff726E3',
        '0x86db38631eE3552b36aB8F2A6dD815a0F5B5d95f',
        '0x10267C823D2410DBC6b39ecC9EfB4e8564F78f8f',
        '0x7D1f13Dd05E6b0673DC3D0BFa14d40A74Cfa3EF2'
    ];

    for (let i=0; i < addrs.length; i++) {
        let bal = await arb.claimableTokens(addr);
        console.log('bal: ', bal);
    }
  
  }
  
//   checkAirdrop();


async function getOzelIndex() {
    const ozDiamondAddr = '0x7D1f13Dd05E6b0673DC3D0BFa14d40A74Cfa3EF2';
    const ozDiamond = await hre.ethers.getContractAt(diamondABI, ozDiamondAddr);

    const index = await ozDiamond.getOzelIndex();
    console.log('index: ', formatEther(index));
}

// getOzelIndex();


async function testFront() {
    const accountAddr = '0x6f7c26E52247C0075DbBaf59e05658784fb69984';
    const acc = await hre.ethers.getContractAt('ozMiddlewareL2', accountAddr);
    
    const [user, token, slippage] = await acc.getDetails();
    console.log('user: ', user);
    console.log('token: ', token);
    console.log('slippage: ', slippage);

}

testFront();




