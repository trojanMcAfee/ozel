const { Bitcoin } = require("@renproject/chains");
const { ethers } = require("ethers");
const { executeBridge } = require('./exec-bridge.js');
const { sendBitcoin } = require('./init-btc-tx.js');
const { MaxUint256, WeiPerEther } = ethers.constants;
const { parseEther, formatEther, keccak256, defaultAbiCoder: abiCoder } = ethers.utils;
const { deploy } = require('./deploy.js');
const { Bridge } = require('arb-ts');
const { arbLog, requireEnvVariables } = require('arb-shared-dependencies');
require('dotenv').config();
const { hexDataLength } = require('@ethersproject/bytes');

const {
    balanceOfPYY, 
    transferPYY, 
    withdrawSharePYY, 
    approvePYY,
    getVarsForHelpers,
    sendETH
} = require('./helpers.js');

const {
    wethAddr,
    renPoolAddr,
    tricryptoAddr,
    usdtAddr,
} = require('./state-vars.js');





const senderPK = process.env.PK_TEST;




async function buffering() {
    const registryAddr = '0x557e211EC5fc9a6737d2C6b7a1aDe3e0C11A8D5D';
    const eth = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const PayMe = await hre.ethers.getContractFactory("PayMe2");
    const payme = await PayMe.deploy(registryAddr);
    await payme.deployed();
    console.log("PayMe3 deployed to:", payme.address);

    const _msg = Buffer.from(eth.substring(2), 'hex');
    await payme.toBuffer(_msg);
}

async function tryGelatoRopsten2() {
    const pokeMeAddr = '0x9C4771560d84222fD8B7d9f15C59193388cC81B3'; //Ops Addr

    const signer = await hre.ethers.provider.getSigner(0);
    const signerAddr = await signer.getAddress();
    console.log('signer address: ', signerAddr);

    const Resolver = await hre.ethers.getContractFactory('Resolver')
    const resolver = await Resolver.deploy(pokeMeAddr, signerAddr);
    await resolver.deployed();
    console.log('resolver deployed to: ', resolver.address);

    toTask(resolver);

}


async function tryGelatoRopsten() {
    const resolverAddr = '0xA1fE693Ca917756eCeF19b6217BA1b56b3e65d2D'; //custom
    const provider = await hre.ethers.provider;
    const signer = provider.getSigner(0);

    let balance = await provider.getBalance(resolverAddr);
    console.log('bal pre: ', ethers.utils.formatEther(balance));

    const tx = {
        to: resolverAddr,
        value: ethers.utils.parseEther('0.01')
    }

    await signer.sendTransaction(tx);
    console.log('eth sent');

    balance = await provider.getBalance(resolverAddr);
    console.log('bal post: ', ethers.utils.formatEther(balance));


}


//-----------------------------------------


async function sendTx(receiver) {
    const signer = await hre.ethers.provider.getSigner(0);
    const amount = ethers.utils.parseEther('0.01');

    const tx = await signer.sendTransaction({
        value: amount,
        to: receiver
    });
    const receipt = await tx.wait();
    console.log('eth sent with hash: ', receipt.transactionHash);

}



async function createTask(resolver, userToken, callvalue) {
    const tx = await resolver.startTask(userToken, callvalue, {
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

const signerX = new ethers.Wallet(process.env.PK);
const l2Provider = new ethers.providers.JsonRpcProvider(process.env.ARB_TESTNET);
const l1ProviderRinkeby = new ethers.providers.JsonRpcProvider(process.env.RINKEBY);
const l2Signer = signerX.connect(l2Provider);
const l1Signer = signerX.connect(l1ProviderRinkeby);


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


let chainId; //arbitrum
let pokeMeOpsAddr; //gelato
let hopBridge;
let usdtAddrArb;
let inbox; //arbitrum rinkeby

let network = 'rinkeby';

switch(network) {
    case 'rinkeby':
        chainId = 421611;
        pokeMeOpsAddr = '0x8c089073A9594a4FB03Fa99feee3effF0e2Bc58a';
        hopBridge = '0xb8901acB165ed027E32754E0FFe830802919727f'; //no testnet
        usdtAddrArb = '0x3B00Ef435fA4FcFF5C209a37d1f3dcff37c705aD';
        inbox = '0x578BAde599406A8fE3d24Fd7f7211c0911F5B29e';
        break;
    case 'mainnet':
        chainId = 42161;
        pokeMeOpsAddr = '0xB3f5503f93d5Ef84b06993a1975B9D21B962892F';
        hopBridge = '0xb8901acB165ed027E32754E0FFe830802919727f';
        usdtAddrArb = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';
        inbox = '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f';
        break;
    case 'ropsten':
        pokeMeOpsAddr = '0x9C4771560d84222fD8B7d9f15C59193388cC81B3';
        break;
}


async function getCalldata(method, params) {
    const signatures = {
        exchangeToUserToken: 'function exchangeToUserToken(address _user, address _userToken)',
        sendToArb: 'function sendToArb(address _userToken, uint256 _callvalue) returns (uint256)'
    };
    const abi = [];
    abi.push(signatures[method]);
    const iface = new ethers.utils.Interface(abi);
    const data = iface.encodeFunctionData(method, params);
    return data;
} 






//Deploys PayMeFacetHop in mainnet and routes ETH to Manager in Arbitrum
async function sendArb() { //mainnet
    const value = parseEther('0.01');
    const depositAmount = parseEther('0.016');
    const bridge = await Bridge.init(l1Signer, l2Signer);
    const signerAddr = await signerX.getAddress();
    
    const manager = await fakeManager(); //manager address in arbitrum
    let tx = await manager.setName('Hello world');
    await tx.wait();

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
    const gasPriceBid = await bridge.l2Provider.getGasPrice();
    console.log(`L2 gas price: ${gasPriceBid.toString()}`);

    let data = getCalldata('exchangeToUserToken', [signerAddr, usdtAddrArb]);

    //***** Calculate MAX GAS ********/

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

    //***** Calculate MAX GAS ********/

    const callValue = maxSubmissionCost.add(gasPriceBid.mul(maxGas)); 
    console.log('callvalue: ', callValue.toString());

    const PayMeHop = await (
        await hre.ethers.getContractFactory('PayMeFacetHop')
    ).connect(l1Signer);
    const paymeHop = await PayMeHop.deploy(
        signerAddr, pokeMeOpsAddr, chainId, 
        hopBridge, manager.address, inbox, 
        maxSubmissionCost, maxGas, gasPriceBid
    , { gasLimit: ethers.BigNumber.from('1000000') });

    await paymeHop.deployed();
    console.log('paymeHop deployed to: ', paymeHop.address);

    await createTask(paymeHop, usdtAddrArb, callValue); // <---------------


    data = getCalldata('sendToArb', [usdtAddrArb, callValue]);

    tx = {
        to: paymeHop.address,
        data,
        value,
        gasLimit: ethers.BigNumber.from('700000')
    };

    // const estGas = await hre.ethers.provider.estimateGas(tx);
    // console.log('estimated gas for sendToArb(): ', estGas.toString());


    const filter = {
        address: paymeHop.address,
        topics: [
            ethers.utils.id("ThrowTicket(uint256)")
        ]
    };

    await hre.ethers.provider.once(filter, async (encodedData) => {
        const { data } = encodedData;
        const ourMessagesSequenceNum = ethers.utils.defaultAbiCoder.decode(['uint'], data);

        console.log('inboxSeqNums: ', ourMessagesSequenceNum);
        // const retryableTxnHash = await bridge.calculateL2RetryableTransactionHash(
        //     ourMessagesSequenceNum
        // );
        // console.log('retryableTxnHash: ', retryableTxnHash);
        // console.log(
        //     `waiting for L2 tx 🕐... (should take < 10 minutes, current time: ${new Date().toTimeString()}`
        // );
        // const retryRec = await l2Provider.waitForTransaction(retryableTxnHash)
        // console.log(`L2 retryable txn executed 🥳 ${retryRec.transactionHash} at ${new Date().toTimeString()}`);


        // const user =(await manager.connect(l2Signer).user()).toString();
        // const userToken = (await manager.connect(l2Signer).userToken()).toString();
        // const num = (await manager.connect(l2Signer).num()).toString();
        // const num2 = (await manager.connect(l2Signer).num2()).toString();
        // const balance1 = (await manager.connect(l2Signer).balance1()).toString();
        // console.log('user: ', user);
        // console.log('userToken: ', userToken);
        // console.log('num: ', num);
        // console.log('num2: ', formatEther(num2));
        // console.log('balance1: ', formatEther(balance1));
    });



    //**** TRIGGER *******/

    await sendTx(paymeHop.address);

    // tx = await paymeHop.sendToArb(usdtAddrArb, callValue, {value});
    // const receipt = await tx.wait();
    // console.log('sendToArb() tx confirmed in L1: ', receipt.transactionHash);

    //*****************/
    

    // const inboxSeqNums = await bridge.getInboxSeqNumFromContractTransaction(
    //     receipt
    // );
    // const ourMessagesSequenceNum = inboxSeqNums[0];
    // console.log('inboxSeqNums string: ', inboxSeqNums[0].toString());
    // const retryableTxnHash = await bridge.calculateL2RetryableTransactionHash(
    //     ourMessagesSequenceNum
    // );
    // console.log('retryableTxnHash: ', retryableTxnHash);
    // console.log(
    //     `waiting for L2 tx 🕐... (should take < 10 minutes, current time: ${new Date().toTimeString()}`
    // );
    // const retryRec = await l2Provider.waitForTransaction(retryableTxnHash)
    // console.log(`L2 retryable txn executed 🥳 ${retryRec.transactionHash} at ${new Date().toTimeString()}`);


    // const user =(await manager.connect(l2Signer).user()).toString();
    // const userToken = (await manager.connect(l2Signer).userToken()).toString();
    // const num = (await manager.connect(l2Signer).num()).toString();
    // const num2 = (await manager.connect(l2Signer).num2()).toString();
    // const balance1 = (await manager.connect(l2Signer).balance1()).toString();
    // console.log('user: ', user);
    // console.log('userToken: ', userToken);
    // console.log('num: ', num);
    // console.log('num2: ', formatEther(num2));
    // console.log('balance1: ', formatEther(balance1));

    

   
    
}




async function beginSimulatedDiamond() {
    const deployedVars = await deploy();
    const {
        deployedDiamond, 
        WETH,
        USDT,
        WBTC,
        renBTC,
        crvTri,
        callerAddr, 
        caller2Addr,
        PYY,
        managerFacet
    } = deployedVars;
    
    getVarsForHelpers(deployedDiamond, PYY, managerFacet, renBTC);

    //First user
    console.log('1st user first transfer');

    await sendETH(callerAddr, usdtAddr, USDT, 'USDT', 10 ** 6);
    await approvePYY(callerAddr);
    console.log('PYY balance on caller 1: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('crvTricrypto token balance on diamondProxy: ', formatEther(await crvTri.balanceOf(deployedDiamond.address)));
    console.log('---------------------------------------'); 
    return;

    //Second user
    console.log('2nd user first transfer');
    await sendETH(caller2Addr, usdtAddr, USDT, 'USDT', 10 ** 6);
    await approvePYY(caller2Addr);
    console.log('PYY balance on caller 2: ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('PYY balance on caller 1 after caller2 swap: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('crvTricrypto token balance on diamondProxy: ', formatEther(await crvTri.balanceOf(deployedDiamond.address)));
    console.log('---------------------------------------'); 

    // //First user - 2nd transfer
    console.log('1st user second transfer'); 
    await sendETH(callerAddr, usdtAddr, USDT, 'USDT', 10 ** 6);
    console.log('PYY balance on caller 1 after 2nd swap: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('PYY balance on caller 2 after caller1 2nd swap: ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('crvTricrypto token balance on diamondProxy: ', formatEther(await crvTri.balanceOf(deployedDiamond.address)));
    console.log('---------------------------------------'); 
    
    //Transfer half of PYY from caller1 to caller2
    console.log('Transfer half of PYY');
    const halfPYYbalance = formatEther(await balanceOfPYY(callerAddr)) / 2;  
    await transferPYY(caller2Addr, parseEther(halfPYYbalance.toString()));
    console.log('PYY balance on caller 1 after transferring half: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('PYY balance on caller 2 after getting half: ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('---------------------------------------'); 
    
    //1st user withdraw remaining share (half)
    console.log('Withdraw 1st user half share (remainder)');  
    await withdrawSharePYY(callerAddr, parseEther(formatEther(await balanceOfPYY(callerAddr))), usdtAddr);
    let usdtBalance = await USDT.balanceOf(callerAddr);
    console.log('USDT balance from fees of caller1: ', usdtBalance.toString() / 10 ** 6); 
    console.log('PYY balance on caller 1 after fees withdrawal: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('PYY balance on caller 2 after fees withdrawal ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('---------------------------------------'); 

    //1st user third transfer
    console.log('1st user third transfer');
    await sendETH(callerAddr, usdtAddr, USDT, 'USDT', 10 ** 6);
    console.log('PYY balance on caller 1: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('PYY balance on caller 2: ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('.');
    
    console.log('After PYY transfer');
    const toTransfer = formatEther(await balanceOfPYY(caller2Addr)) / 3;
    await transferPYY(callerAddr, parseEther(toTransfer.toString()), 1);
    console.log('PYY balance on caller 1: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('PYY balance on caller 2: ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('.');

    console.log('Withdrawing 1/3');
    await withdrawSharePYY(caller2Addr, parseEther(toTransfer.toString()), usdtAddr);
    usdtBalance = await USDT.balanceOf(caller2Addr);
    console.log('USDT balance from fees of caller2: ', formatEther(usdtBalance));
    console.log('PYY balance on caller 1: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('PYY balance on caller 2: ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('.');
    console.log('crvTricrypto token balance on diamondProxy: ', formatEther(await crvTri.balanceOf(deployedDiamond.address)));
    /**+++++++++ END OF SIMULATION CURVE SWAPS ++++++++**/
}






// createTask();

// tryGelatoRopsten();

// beginSimulatedDiamond();

sendArb();

// tryPrecompile();

// sendTx();

// impersonateTx();

// .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
  

// buffering();

