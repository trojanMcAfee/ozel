const { ethers } = require("ethers");
const { parseEther, formatEther, defaultAbiCoder: abiCoder, keccak256 } = ethers.utils;
const { deploy } = require('./deploy.js');
const { Bridge } = require('arb-ts');
const { hexDataLength } = require('@ethersproject/bytes');
require('dotenv').config();

const {
    balanceOfPYY, 
    transferPYY, 
    withdrawSharePYY, 
    getVarsForHelpers,
    sendETH,
    getCalldata,
    getCalldata2
} = require('./helpers.js');

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
    defaultSlippage
 } = require('./state-vars.js');




//-----------------------------------------


async function sendTx(receiver) {
    const signer = await hre.ethers.provider.getSigner(0);
    const amount = ethers.utils.parseEther('0.01');

    const tx = await signer.sendTransaction({
        value: amount,
        to: receiver,
        gasLimit: ethers.BigNumber.from('1000000'),
        // nonce: 8,
        gasPrice: ethers.BigNumber.from('30897522792')
    });
    const receipt = await tx.wait();
    console.log('eth sent with hash: ', receipt.transactionHash);
}



async function createTask(resolver, callvalue) {
    const tx = await resolver.startTask(callvalue, {
        gasLimit: ethers.BigNumber.from('200000'),
        gasPrice: ethers.BigNumber.from('30697522792')
    });
    const receipt = await tx.wait();
    const { data } = receipt.events[0];

    const abiCoder = ethers.utils.defaultAbiCoder;
    const args = [
        "address", "address", "bytes4", "address", "bytes32",
        "bytes", "bool", "address", "bytes32"
    ];
    const decodedData = abiCoder.decode(args, data);
    console.log('task id: ', decodedData[4]);
}





async function calculateMaxGas(
    userDetails, managerAddr, value, maxSubmissionCost, gasPriceBid
) {
    const data = getCalldata('exchangeToUserToken', [userDetails]);
    const depositAmount = parseEther('0.1');
    const nodeAddr = '0x00000000000000000000000000000000000000C8';
    const nodeInterface = await (
        await hre.ethers.getContractAt('NodeInterface', nodeAddr)
    ).connect(l2Signer);

    let [maxGas]  = await nodeInterface.estimateRetryableTicket(
        userDetails[0],
        depositAmount,
        managerAddr,
        value,
        maxSubmissionCost,
        managerAddr,
        managerAddr,
        3000000,
        gasPriceBid,
        data
    );
    maxGas = maxGas.toString();
    console.log('maxGas: ', maxGas);

    return maxGas; 
}



async function getGasDetailsL2(userDetails, bridge) {
    const sendToArbBytes = ethers.utils.defaultAbiCoder.encode(
        ['tuple(address, address, uint256)'],
        [userDetails]
    );
    const sendToArbBytesLength = hexDataLength(sendToArbBytes) + 4;

    const [_submissionPriceWei, nextUpdateTimestamp] =
    await bridge.l2Bridge.getTxnSubmissionPrice(sendToArbBytesLength);
    console.log(
    `Current retryable base submission price: ${_submissionPriceWei.toString()}`
    );

    const timeNow = Math.floor(new Date().getTime() / 1000);
    console.log(
        `time in seconds till price update: ${
        nextUpdateTimestamp.toNumber() - timeNow
        }`
    );

    let maxSubmissionCost = _submissionPriceWei.mul(5);
    maxSubmissionCost = ethers.BigNumber.from(maxSubmissionCost).mul(100)
    console.log('maxSubmissionCost: ', maxSubmissionCost.toString());

    let gasPriceBid = await bridge.l2Provider.getGasPrice();
    gasPriceBid = gasPriceBid.add(ethers.BigNumber.from(gasPriceBid).div(2));
    console.log(`gasPriceBid: ${gasPriceBid.toString()}`);

    return {
        maxSubmissionCost,
        gasPriceBid
    }
}




async function tryPrecompile() {
    const bridge = await Bridge.init(l1Signer, l2Signer);
    const arbRetryableAddr = '0x000000000000000000000000000000000000006E';
    const arbRetryable = await hre.ethers.getContractAt('ArbRetryableTx', arbRetryableAddr);
    const req = 213702;

    // const txId = keccak256(abiCoder.encode(['uint'], [req]), 0); //abiCoder.encode(['uint'], [req]), 0
    // console.log('txId: ', txId); //req, 0

    // const beneficiary = await arbRetryable.getBeneficiary(txId, {
    //     gasLimit: ethers.BigNumber.from('10000000')
    // });
    // console.log('beneficiary: ', beneficiary);
    
    // const hashes = [];
    // const x = '0x17de80e4ed05eefc31e6d2827232e6f620876f11c8fa0651eb722d943459d22c';
    // hashes.push(x);


    // for (let i = 0; i < hashes.length; i++) {
        // const timeOut = await arbRetryable.getTimeout('0xd208f7b3e47ab1f8c12e5f5aae5cd5cb7811c66a92a32974f46bd6a5afbe410a', {
        //     gasLimit: ethers.BigNumber.from('10000000')
        // });
        // console.log('timeOut: ', timeOut.toString());
    // }

    await arbRetryable.redeem('0x6b1e2c8ddd28d450eb80b8bf0fb87b1e7201897c077b66992610019d12c5a4c8');
    console.log('redeemed');

    await arbRetryable.redeem('0x51cdb4f34b799bbe96b4750627dd5e714194adf4ebfc9cfa378083e7aa5fd810');
    console.log('redeemed');

    // const lifetime = await arbRetryable.getLifetime();
    // console.log('lifetime: ', lifetime.toString()); 


    // const ticketId = await bridge.calculateL2TransactionHash(ethers.BigNumber.from(req), l2Provider);

    // const x = await arbRetryable.getTimeout(ticketId);
    // console.log('x: ', x.toString());

    //---------------

    // const withPacked = '0x44Df79cAfB43967664ACbDB4A53F3881204B976C';
    // const withoutPacked = '0x04122568bDb8265714d03E9436FAe47c96DCcf17';

    // // const arbRetryable = await hre.ethers.getContractAt('Test', withPacked);
    // const ArbRetryable = await hre.ethers.getContractFactory('Test');
    // const arbRetryable = await ArbRetryable.deploy();
    // await arbRetryable.deployed();

    // console.log('arbRetryable deployed to: ', arbRetryable.address);

    // const y = await arbRetryable.getTO(req);
    // console.log('y: ', y);    


}





async function deployContract(contractName, signer, addressForConst, bytes) {
    const Contract = await (
        await hre.ethers.getContractFactory(contractName)
    ).connect(signer);
    // const Contract = await hre.ethers.getContractFactory(contractName);

    const ops = {
        gasLimit: ethers.BigNumber.from('5000000'),
        gasPrice: ethers.BigNumber.from('30897522792')
    };

    let contract;
    if (bytes && bytes.length > 0) {
        console.log(3);
        contract = await Contract.deploy(addressForConst, bytes, ops);
    } else if (addressForConst) {
        console.log(4);
        contract = await Contract.deploy(addressForConst, ops);
    } else {
        contract = await Contract.deploy(ops);
    }

    await contract.deployed();
    console.log(`${contractName} deployed to: `, contract.address);

    return contract.address;
}




//Deploys PayMeFacetHop in mainnet and routes ETH to Manager (PYY) in Arbitrum
async function sendArb() { //mainnet
    const bridge = await Bridge.init(l1Signer, l2Signer);
    // const value = parseEther('0.1');
    const signerAddr = await signerX.getAddress();
    console.log('signer address: ', signerAddr);

    const userDetails = [
        signerAddr,
        usdtAddrArb,
        defaultSlippage
    ];
    
    //Deploys the fake PYY on arbitrum testnet 
    // const fakePYYaddr = await deployContract('FakePYY', l2Signer); //fake PYY address in arbitrum
    const fakePYYaddr = '0xCF383dD43481703a6ebe84DC4137Ae388cD7214b';
   

    //Calculate fees on L1 > L2 arbitrum tx
    const { maxSubmissionCost, gasPriceBid } = await getGasDetailsL2(userDetails, bridge);
    // const maxGas = await calculateMaxGas(userDetails, fakePYYaddr, value, maxSubmissionCost, gasPriceBid);
    const maxGas = 3000000;
    const autoRedeem = maxSubmissionCost.add(gasPriceBid.mul(maxGas));
    console.log('autoRedeem: ', autoRedeem.toString()); 


    //Deploys Emitter
    // const emitterAddr = await deployContract('Emitter', l1Signer);
    const emitterAddr = '0xeD64c50c0412DC24B52aC432A3b723e16E18776B';

    //Deploys PayMe in mainnet
    // for (let i = 0; i < 4; i++) {


    let PayMeHop = await (
        await hre.ethers.getContractFactory('PayMeFacetHop')
    ).connect(l1Signer);
    // let PayMeHop = await hre.ethers.getContractFactory('PayMeFacetHop');
    // let paymeHop = await PayMeHop.deploy(
    //     pokeMeOpsAddr, 
    //     fakePYYaddr, inbox, 
    //     maxSubmissionCost, maxGas, gasPriceBid,
    //     signerAddr, usdtAddrArb, defaultSlippage, 
    //     emitterAddr, autoRedeem
    // , { 
    //     gasLimit: ethers.BigNumber.from('5000000'),
    //     gasPrice: ethers.BigNumber.from('30897522792')
    //  }); 
    let paymeHop = await PayMeHop.deploy(pokeMeOpsAddr, { 
        gasLimit: ethers.BigNumber.from('5000000'),
        gasPrice: ethers.BigNumber.from('30897522792')
     }); 

    await paymeHop.deployed();
    const paymeHopAddr = paymeHop.address;
    //0x31ED67cd9F4520c4783DD779cb0E824e61C2B665
    // const paymeHop = await hre.ethers.getContractAt('PayMeFacetHop', paymeHopAddr);
    // console.log('taskID: ', (await paymeHop.taskId()).toString());
    console.log(`paymeHop deployed to: `, paymeHopAddr);

    // const iface = new ethers.utils.Interface(['function initialize(address pyy_, address inbox_, uint256 maxSubmissionCost_, uint256 maxGas_, uint256 gasPriceBid_, address user_, address userToken_, uint256 userSlippage_, address emitter_, uint256 autoRedeem_) external']);
    // const initData = iface.encodeFunctionData('initialize', [
    //     fakePYYaddr, inbox, maxSubmissionCost, maxGas,
    //     gasPriceBid, signerAddr, usdtAddrArb, defaultSlippage,
    //     emitterAddr, autoRedeem
    // ]);

    const iface = new ethers.utils.Interface(['function initialize2(address pyy_, address inbox_, uint256 maxSubmissionCost_, uint256 maxGas_, uint256 gasPriceBid, address user_, address userToken_, uint256 userSlippage_, address emitter_, uint256 autoRedeem_) external']);
    const initData = iface.encodeFunctionData('initialize2', [
        fakePYYaddr, inbox, maxSubmissionCost, maxGas,
        gasPriceBid, signerAddr, usdtAddrArb, defaultSlippage,
        emitterAddr, autoRedeem
    ]);

    //Deploys Beacon system
    const beaconAddr = await deployContract('UpgradeableBeacon', l1Signer, paymeHopAddr);
    // const beaconAddr = '0x384cC0B016C2002f49E2e7CB88c33EE942C26DCf';
    const beaconProxyAddr = await deployContract('BeaconProxy', l1Signer, beaconAddr, initData);
 
    console.log('return here');
    return;

    const filter = {
        address: emitterAddr,
        topics: [
            ethers.utils.id("showTicket(uint256)")
        ]
    };


    await hre.ethers.provider.on(filter, async (encodedData) => {
        const { data } = encodedData;
        const ourMessagesSequenceNum = ethers.utils.defaultAbiCoder.decode(['uint'], data);

        console.log('inboxSeqNums: ', ourMessagesSequenceNum.toString());
        const retryableTxnHash = await bridge.calculateL2RetryableTransactionHash(
            ourMessagesSequenceNum[0]
        );
        console.log('retryableTxnHash: ', retryableTxnHash);
        console.log(
            `waiting for L2 tx 🕐... (should take < 10 minutes, current time: ${new Date().toTimeString()}`
        );
        const retryRec = await l2Provider.waitForTransaction(retryableTxnHash)
        console.log(`L2 retryable txn executed 🥳 ${retryRec.transactionHash} at ${new Date().toTimeString()}`);
    });


    //**** TRIGGER for Gelato *******/
    await sendTx(beaconProxyAddr);

    // const tx = await paymeHop.sendToArb(autoRedeem, {
    //     gasLimit: ethers.BigNumber.from('5000000'),
    //     gasPrice: ethers.BigNumber.from('30097522792')
    // });
    // const receipt = await tx.wait();
    // console.log('sendToArb hash: ', receipt.transactionHash);

}









async function getCount() {
    const signerAddr = await signerX.getAddress();

    const latest = await hre.ethers.provider.getTransactionCount(signerAddr,'latest');
    console.log('x: ', latest);

}

// getCount();







async function beginSimulatedDiamond() {
    const deployedVars = await deploy();
    const {
        deployedDiamond, 
        WETH,
        USDT,
        WBTC,
        renBTC,
        USDC,
        MIM,
        FRAX,
        crvTri,
        callerAddr, 
        caller2Addr,
        pyyFacet,
        yvCrvTri
    } = deployedVars;
    
    getVarsForHelpers(deployedDiamond, pyyFacet); 

    //First user
    console.log('1st user first transfer');

    /**
     * Since Curve doesn't have testnets, sendETH() sends ETH directly to
     * exchangeToUserToken() which would simulate an Arbitrum L1 > L2 tx where
     * sendToArb() in L1 in PayMeFacetHop would send the ETH to managerFacet in L2
     */

    await sendETH([callerAddr, fraxAddr, defaultSlippage], FRAX, 'FRAX', 10 ** 18); //callerAddr, fraxAddr, FRAX, 'FRAX', 10 ** 18
    console.log('PYY balance on caller 1: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('yvCrvTricrypto token balance on diamondProxy: ', formatEther(await yvCrvTri.balanceOf(deployedDiamond.address)));
    console.log('---------------------------------------'); 

    //Second user
    console.log('2nd user first transfer');
    await sendETH([caller2Addr, wbtcAddr, defaultSlippage], WBTC, 'WBTC', 10 ** 8, 1); 
    console.log('PYY balance on caller 2: ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('PYY balance on caller 1 after caller2 swap: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('yvCrvTricrypto token balance on diamondProxy: ', formatEther(await yvCrvTri.balanceOf(deployedDiamond.address)));
    console.log('---------------------------------------'); 


    // //First user - 2nd transfer
    console.log('1st user second transfer'); 
    await sendETH([callerAddr, mimAddr, defaultSlippage], MIM, 'MIM', 10 ** 18); //in Arb, USDC has 6
    console.log('PYY balance on caller 1 after 2nd swap: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('PYY balance on caller 2 after caller1 2nd swap: ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('yvCrvTricrypto token balance on diamondProxy: ', formatEther(await yvCrvTri.balanceOf(deployedDiamond.address)));
    console.log('---------------------------------------'); 
    
    //Transfer half of PYY from caller1 to caller2
    console.log('Transfer half of PYY');
    const halfPYYbalance = formatEther(await balanceOfPYY(callerAddr)) / 2;  
    await transferPYY(caller2Addr, parseEther(halfPYYbalance.toString()));
    console.log('PYY balance on caller 1 after transferring half: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('PYY balance on caller 2 after getting half: ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('---------------------------------------'); 
    
    //1st user withdraw remaining share (half)
    console.log('Withdraw 1st user share (remainder)');
    await withdrawSharePYY([callerAddr, usdtAddrArb, defaultSlippage], callerAddr, parseEther(formatEther(await balanceOfPYY(callerAddr))));
    let usdtBalance = await USDT.balanceOf(callerAddr);
    console.log('USDT balance from fees of caller1: ', usdtBalance.toString() / 10 ** 6); 
    console.log('PYY balance on caller 1 after fees withdrawal: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('PYY balance on caller 2 after fees withdrawal ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('---------------------------------------'); 

    //1st user third transfer
    console.log('1st user third transfer');
    await sendETH([callerAddr, usdtAddrArb, defaultSlippage], USDT, 'USDT', 10 ** 6);
    console.log('PYY balance on caller 1: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('PYY balance on caller 2: ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('.');
    
    console.log('After PYY transfer'); 
    const toTransfer = formatEther(await balanceOfPYY(caller2Addr)) / 3;
    await transferPYY(callerAddr, parseEther(toTransfer.toString()), 1);
    console.log('PYY balance on caller 1: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('PYY balance on caller 2: ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('.');

    console.log('Withdrawing 1/3 (caller 2)'); 
    await withdrawSharePYY([caller2Addr, usdtAddrArb, defaultSlippage], caller2Addr, parseEther(toTransfer.toString()), 1);
    usdtBalance = await USDT.balanceOf(caller2Addr);
    console.log('USDT balance from fees of caller2: ', usdtBalance.toString() / 10 ** 6);
    console.log('PYY balance on caller 1: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('PYY balance on caller 2: ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('.');
    console.log('yvCrvTricrypto token balance on diamondProxy: ', formatEther(await yvCrvTri.balanceOf(deployedDiamond.address)));


    // usdtBalance = await USDT.balanceOf(callerAddr);
    // console.log('USDT balance from fees of caller: ', usdtBalance.toString() / 10 ** 6);
    /**+++++++++ END OF SIMULATION CURVE SWAPS ++++++++**/
}




// createTask();

// tryGelatoRopsten();

// beginSimulatedDiamond();

sendArb();

// tryPrecompile();

// sendTx('0x8A63AcA6622B6B32ea76c378f38fd5D6182ADD18');
// sendTx('0xcDFfcc5DE7ee15d46080a813509aB237CC62cDB9');
// sendTx('0xfb3744F7dcd34EC11d262A3925a1E6ea6412d751');
// sendTx('0xf9FE99ddBAbb08f4332e9AC9F256C006231EeC8F');



//new with emitter and maxGas: 0xBb8FDbD6D27b39B62A55e38974B3CFA7430A1fb9
//new with emitter and 10 instead of maxGas: 0xAd467bbB7c72B04EAbCBC9CEBdc27e5A3029e308

// impersonateTx();

// .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
  

// buffering();

