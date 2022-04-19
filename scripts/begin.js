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
    getCalldata
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
        gasLimit: ethers.BigNumber.from('1000000')
    });
    const receipt = await tx.wait();
    console.log('eth sent with hash: ', receipt.transactionHash);
}



async function createTask(resolver, userDetails, callvalue) {
    const tx = await resolver.startTask(userDetails, callvalue, {
        gasLimit: ethers.BigNumber.from('200000')
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




//Deploys the fake manager on arbitrum testnet 
async function fakeManager() {
    const Test2 = await ( 
        await hre.ethers.getContractFactory('Test2')
    ).connect(l2Signer);
    const test2 = await Test2.deploy();
    await test2.deployed();
    console.log('fake manager deployed in arbitrum testnet to: ', test2.address);
    return test2;
}



async function calculateMaxGas(
    signerAddr, manager, value, maxSubmissionCost, gasPriceBid
) {
    const data = getCalldata('exchangeToUserToken', [signerAddr, usdtAddrArb]);
    const depositAmount = parseEther('0.016');
    const nodeAddr = '0x00000000000000000000000000000000000000C8';
    const nodeInterface = await (
        await hre.ethers.getContractAt('NodeInterface', nodeAddr)
    ).connect(l2Signer);

    let [maxGas]  = await nodeInterface.estimateRetryableTicket(
        signerAddr,
        depositAmount,
        manager.address,
        value,
        maxSubmissionCost,
        manager.address,
        manager.address,
        3000000,
        gasPriceBid,
        data
    );
    maxGas = maxGas.toString();
    console.log('maxGas: ', maxGas);

    return maxGas; 
}


async function getGasDetailsL2(signerAddr, bridge) {
    const sendToArbBytes = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address'],
        [signerAddr, usdtAddrArb]
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

    const maxSubmissionCost = _submissionPriceWei.mul(5); //parseEther('0.01');
    console.log('maxSubmissionCost: ', maxSubmissionCost.toString());
    const gasPriceBid = await bridge.l2Provider.getGasPrice();
    console.log(`L2 gas price: ${gasPriceBid.toString()}`);

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
    //     const timeOut = await arbRetryable.getTimeout(hashes[i], {
    //         gasLimit: ethers.BigNumber.from('10000000')
    //     });
    //     console.log('timeOut: ', timeOut.toString());
    // }

    const lifetime = await arbRetryable.getLifetime();
    console.log('lifetime: ', lifetime.toString()); 


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








//Deploys PayMeFacetHop in mainnet and routes ETH to Manager (PYY) in Arbitrum
async function sendArb() { //mainnet
    const bridge = await Bridge.init(l1Signer, l2Signer);
    const value = parseEther('0.01');
    const signerAddr = await signerX.getAddress();
    console.log('signer address: ', signerAddr);
    
    const manager = await fakeManager(); //manager address in arbitrum
    let tx = await manager.setName('Hello world');
    await tx.wait();

    //Calculate fees on L1 > L2 arbitrum tx
    const { maxSubmissionCost, gasPriceBid } = await getGasDetailsL2(signerAddr, bridge);
    const maxGas = await calculateMaxGas(signerAddr, manager, value, maxSubmissionCost, gasPriceBid);
    const callValue = maxSubmissionCost.add(gasPriceBid.mul(maxGas)); 
    console.log('gasPriceBid: ', gasPriceBid.toString());
    console.log('callvalue: ', callValue.toString());

    //Deploys PayMe in mainnet
    const PayMeHop = await (
        await hre.ethers.getContractFactory('PayMeFacetHop')
    ).connect(l1Signer);
    const paymeHop = await PayMeHop.deploy(
        signerAddr, pokeMeOpsAddr, chainId, 
        manager.address, inbox, 
        maxSubmissionCost, 10, gasPriceBid //maxGas instead of 10
    , { gasLimit: ethers.BigNumber.from('5000000') });

    await paymeHop.deployed();
    console.log('paymeHop deployed to: ', paymeHop.address);
 

    //Creates Gelato task (with struct)
    const userDetails = [
        signerAddr,
        usdtAddrArb,
        defaultSlippage
    ];
    await createTask(paymeHop, userDetails, callValue); 

    //Sets up Event listener for ticketID to track the L2 tx
    // const filter = {
    //     address: paymeHop.address,
    //     topics: [
    //         ethers.utils.id("ThrowTicket(uint256)")
    //     ]
    // };

    // const l2Hashes = [];
    // const arbRetryableAddr = '0x000000000000000000000000000000000000006E';
    // const arbRetryable = await hre.ethers.getContractAt('ArbRetryableTx', arbRetryableAddr);

    // await hre.ethers.provider.once(filter, async (encodedData) => { 
    //     const { data } = encodedData;
    //     const ourMessagesSequenceNum = ethers.utils.defaultAbiCoder.decode(['uint'], data);

    //     console.log('inboxSeqNums: ', ourMessagesSequenceNum.toString());
    //     const retryableTxnHash = await bridge.calculateL2RetryableTransactionHash(
    //         ourMessagesSequenceNum[0]
    //     );
    //     console.log('retryableTxnHash: ', retryableTxnHash);
    //     console.log(
    //         `waiting for L2 tx 🕐... (should take < 10 minutes, current time: ${new Date().toTimeString()}`
    //     );

    //     l2Hashes.push(retryableTxnHash);
    //     console.log('l2Hashes: ', l2Hashes);


    //     // const retryRec = await l2Provider.waitForTransaction(retryableTxnHash)
    //     // console.log(`L2 retryable txn executed 🥳 ${retryRec.transactionHash} at ${new Date().toTimeString()}`);
    // });


    //**** TRIGGER for Gelato *******/
    // await sendTx(paymeHop.address);

    // setInterval(async function() {
    //     for (let i = 0; i < l2Hashes.length; i++) {
    //         console.log('hash in interval: ', l2Hashes[i]);
    //         let x = await arbRetryable.getTimeout(l2Hashes[i]);
    //         // if (x > 0) {
    //         //     await arbRetryable.redeem(l2Hashes[i]);
    //         // }
    //     }
    // }, 60000);
    
    // tx = await paymeHop.sendToArb(usdtAddrArb, callValue, {
    //     value: ethers.utils.parseEther('0.01'),
    //     gasLimit: ethers.BigNumber.from('3000000')
    // });
    // const receipt = await tx.wait();
    // console.log('L1 tx hash: ', receipt.transactionHash);


}






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

beginSimulatedDiamond();

// sendArb();

// tryPrecompile();

// sendTx('0x0537FE8783444244792e25F73a64a34C8E68fA2c');

// impersonateTx();

// .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
  

// buffering();

