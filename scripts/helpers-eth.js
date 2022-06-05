const { Bridge } = require('arb-ts');
const { hexDataLength } = require('@ethersproject/bytes');

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
    chainlinkAggregatorAddr
} = require('../scripts/state-vars.js');

const { hexStripZeros, parseEther } = ethers.utils;


let proxyFactory;



async function getGasDetailsL2(userDetails, bridge) {
    const sendToArbBytes = ethers.utils.defaultAbiCoder.encode(
        ['tuple(address, address, uint256)'],
        [userDetails]
    );
    const sendToArbBytesLength = hexDataLength(sendToArbBytes) + 4;

    const [_submissionPriceWei, nextUpdateTimestamp] =
    await bridge.l2Bridge.getTxnSubmissionPrice(sendToArbBytesLength);
    // console.log(
    // `Current retryable base submission price: ${_submissionPriceWei.toString()}`
    // );

    const timeNow = Math.floor(new Date().getTime() / 1000);
    // console.log(
    //     `time in seconds till price update: ${
    //     nextUpdateTimestamp.toNumber() - timeNow
    //     }`
    // );

    let maxSubmissionCost = _submissionPriceWei.mul(5);
    maxSubmissionCost = ethers.BigNumber.from(maxSubmissionCost).mul(100)
    // console.log('maxSubmissionCost: ', maxSubmissionCost.toString());

    let gasPriceBid = await bridge.l2Provider.getGasPrice();
    gasPriceBid = gasPriceBid.add(ethers.BigNumber.from(gasPriceBid).div(2));
    // console.log(`gasPriceBid: ${gasPriceBid.toString()}`);

    return {
        maxSubmissionCost,
        gasPriceBid
    }
}


async function deployContract(contractName, signer, constrArgs) {
    const Contract = await hre.ethers.getContractFactory(contractName);

    switch(contractName) {
        case 'UpgradeableBeacon':
            contract = await Contract.deploy(constrArgs);
            break;
        case 'ozUpgradeableBeacon':
        case 'ozERC1967Proxy':
        case 'RolesAuthority':
            ([ var1, var2 ] = constrArgs);
            contract = await Contract.deploy(var1, var2);
            break;
        case 'ozERC1967Proxy':
            ([ var1, var2, var3 ] = constrArgs);
            contract = await Contract.deploy(var1, var2, var3);
            break;
        case 'StorageBeacon':
            ([ var1, var2, var3, var4 ] = constrArgs);
            contract = await Contract.deploy(var1, var2, var3, var4);
            break;
        default:
            contract = await Contract.deploy();
    }

    await contract.deployed();
    console.log(`${contractName} deployed to: `, contract.address);

    return [
        contract.address,
        contract
    ];
}



async function sendTx(params) {
    const [ signer, signer2 ] = await ethers.getSigners();
    const txDetails = {to: params.receiver};
    const abi = [];
    const signatures = {
        createNewProxy: 'function createNewProxy(tuple(address user, address userToken, uint256 userSlippage) userDetails_)',
        getTaskID: 'function getTaskID(address proxy_) returns (bytes32)',
        sendToArb: `function sendToArb(${params.isEvil ? 'tuple(uint256 maxSubmissionCost, uint256 gasPriceBid, uint256 autoRedeem) varConfig_, tuple(address user, address userToken, uint256 userSlippage) userDetails_)' : ')'}`,
        initialize: `function initialize(${params.args && params.args.length < 2 ? 'address beacon_' : 'uint256 userId_, address beacon_'})`,
        _setBeacon: 'function _setBeacon(address beacon, bytes memory data)',
        changeUserToken: 'function changeUserToken(address newUserToken_)',
        changeUserSlippage: 'function changeUserSlippage(uint256 newUserSlippage_)'        
    };


    if (params.isAmount) txDetails.value = parseEther(params.value.toString()); 

    if (params.method !== 'Sending ETH') {
        for (let sign in signatures) {
            if (sign === params.method) {
                signature = signatures[sign];
            }
        }
        abi.push(signature);
        iface = new ethers.utils.Interface(abi);

        if (params.args) {
            data = iface.encodeFunctionData(params.method, params.args); 
        } else {
            data = iface.encodeFunctionData(params.method);
        }
        txDetails.data = data;
    } 
    
    if (!params.isSigner2) {
        tx = await signer.sendTransaction(txDetails);
    } else {
        tx = await signer2.sendTransaction(txDetails);
    }
    const receipt = await tx.wait();
    // console.log(`${method} with hash: `, receipt.transactionHash);
    return receipt;
}


async function createProxy(userDetails) {
    await sendTx({
        receiver: proxyFactory,
        method: 'createNewProxy',
        args: [userDetails]
    });
}


async function getArbitrumParams(userDetails) {
    const bridge = await Bridge.init(l1Signer, l2Signer);
    const { maxSubmissionCost, gasPriceBid } = await getGasDetailsL2(userDetails, bridge);
    const maxGas = 3000000;
    const autoRedeem = maxSubmissionCost.add(gasPriceBid.mul(maxGas));

    return [
        maxSubmissionCost,
        gasPriceBid,
        maxGas,
        autoRedeem
    ];
}


async function activateOzBeaconProxy(proxy) {
    await sendTx({
        receiver: proxy, 
        method: 'sendToArb',
        isAmount: false,
        args: false
    });
}


function getEventParam(receipt) {
    return hexStripZeros(receipt.logs[0].topics[2]);
}


async function sendETHv2(receiver) {
    await sendTx({
        receiver: receiver,
        isAmount: true,
        method: 'Sending ETH',
        value: 0.01,
        args: false
    });
}


async function activateProxyLikeOps(proxy, taskCreator, isEvil, evilParams) {
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [pokeMeOpsAddr],
    });

    const opsSigner = await hre.ethers.provider.getSigner(pokeMeOpsAddr);
    let iface = new ethers.utils.Interface(['function checker()']);
    const resolverData = iface.encodeFunctionData('checker');
    const ops = await hre.ethers.getContractAt('IOps', pokeMeOpsAddr);
    const resolverHash = await ops.connect(opsSigner).getResolverHash(proxy, resolverData);

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [pokeMeOpsAddr],
    });

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [gelatoAddr],
    });

    const gelatoSigner = await hre.ethers.provider.getSigner(gelatoAddr); 
    iface = new ethers.utils.Interface([`function sendToArb(${isEvil ? 'tuple(uint256 maxSubmissionCost, uint256 gasPriceBid, uint256 autoRedeem) varConfig_, tuple(address user, address userToken, uint256 userSlippage) userDetails_)' : ')'}`]); 
    let execData;
    if (isEvil) {
        execData = iface.encodeFunctionData('sendToArb', evilParams);
    } else {
        execData = iface.encodeFunctionData('sendToArb');
    }
    const tx = await ops.connect(gelatoSigner).exec(0, ETH, taskCreator, false, false, resolverHash, proxy, execData);
    const receipt = await tx.wait();

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [gelatoAddr],
    });

    return receipt;
}

function compareTopicWith(type , value, receipt) {
    if (receipt.events) {
        for (let i=0; i < receipt.events.length; i++) {
            for (let j=0; j < receipt.events[i].topics.length; j++) {
                let topic = hexStripZeros(receipt.events[i].topics[j]);
                if (parseInt(topic) === parseInt(value)) { 
                    if (type === 'Signer') {
                        return true;
                    } else if (type === 'Signature') {
                        const ticketID = receipt.events[i].topics[1];
                        return ticketID;
                    }
                }
            }
        }
        return false;
    } else {
        return false;
    }
}

// function compareTopicWith2(type , value, receipt) {
//     if (receipt.events) {
//         for (let i=0; i < receipt.events.length; i++) {
//             for (let j=0; j < receipt.events[i].topics.length; j++) {
//                 let topic = hexStripZeros(receipt.events[i].topics[j]);
//                 console.log('topic: ', topic);
//                 console.log('value: ', value);
//                 console.log('.');
//                 if (parseInt(topic) === parseInt(value)) { 
//                     if (type === 'Signer') {
//                         return true;
//                     } else if (type === 'Signature') {
//                         const ticketID = receipt.events[i].topics[1];
//                         console.log('ticketID ^^^^: ', ticketID);
//                         return ticketID;
//                     }
//                 }
//             }
//         }
//         console.log('here');
//         return false;
//     } else {
//         return false;
//     }
// }


async function deployAnotherStorageBeacon(fakePYYaddr, emitterAddr, userDetails) { 
    const [ maxSubmissionCost, gasPriceBid, maxGas, autoRedeem ] = await getArbitrumParams(userDetails);

    const fxConfig = [
        inbox, 
        pokeMeOpsAddr,
        fakePYYaddr,
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

    return [storageBeaconAddr, storageBeacon] = await deployContract('StorageBeacon', l1Signer, constrArgs);
}



async function deploySystemOptimistically(userDetails, signerAddr) {
    let constrArgs = [];

    //Deploys the fake PYY on arbitrum testnet 
    const [ fakePYYaddr ] = await deployContract('FakePYY', l1Signer);
    // const fakePYYaddr = '0xCF383dD43481703a6ebe84DC4137Ae388cD7214b';

    //Calculate fees on L1 > L2 arbitrum tx
    const [ maxSubmissionCost, gasPriceBid, maxGas, autoRedeem ] = await getArbitrumParams(userDetails);

    // Deploys Emitter
    const [emitterAddr, emitter] = await deployContract('Emitter', l1Signer);

    //Deploys ozPayMe in mainnet
    const [ozPaymeAddr] = await deployContract('ozPayMe', l1Signer);

    //Deploys StorageBeacon
    const fxConfig = [
        inbox, 
        pokeMeOpsAddr,
        fakePYYaddr,
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

    const [storageBeaconAddr, storageBeacon] = await deployContract('StorageBeacon', l1Signer, constrArgs);

    //Deploys UpgradeableBeacon
    constrArgs = [
        ozPaymeAddr,
        storageBeaconAddr
    ];

    const [beaconAddr, beacon] = await deployContract('ozUpgradeableBeacon', l1Signer, constrArgs); 
    await storageBeacon.storeBeacon(beaconAddr);
    await emitter.storeBeacon(beaconAddr);

    //Deploys ProxyFactory
    const [proxyFactoryAddr] = await deployContract('ProxyFactory', l1Signer);

    //Deploys pyERC1967Proxy
    constrArgs = [
        proxyFactoryAddr,
        '0x'
    ];

    const [ozERC1967proxyAddr] = await deployContract('ozERC1967Proxy', l1Signer, constrArgs);
    await sendTx({
        receiver: ozERC1967proxyAddr,
        method: 'initialize',
        args: [beaconAddr],
        isAmount: false
    });

    //Deploys Auth
    constrArgs = [
        signerAddr,
        beaconAddr
    ];

    const [rolesAuthorityAddr, rolesAuthority] = await deployContract('RolesAuthority', l1Signer, constrArgs);
    await beacon.setAuth(rolesAuthorityAddr);

    //Set ERC1967Proxy to role 1 and gives it authority to call the functions in StorageBeacon
    await rolesAuthority.setUserRole(ozERC1967proxyAddr, 1, true);

    await rolesAuthority.setRoleCapability(1, storageBeaconAddr, '0x74e0ea7a', true); //issueUserID(UserConfig memory userDetails_)
    await rolesAuthority.setRoleCapability(1, storageBeaconAddr, '0x68e540e5', true); //saveUserProxy(address sender_, address proxy_)
    await rolesAuthority.setRoleCapability(1, storageBeaconAddr, '0xf2034a69', true); //saveTaskId(address proxy_, bytes32 id_)


    //Set signerAddr to role 0 for calling disableEmitter() on ozPayMe
    // await rolesAuthority.setUserRole(signerAddr, 0, true); //<---- try to replace onlyOwner by this later
    
    // await rolesAuthority.setRoleCapability(0, storageBeaconAddr, '0xf9f4db8a', true); //changeVariableConfig(VariableConfig memory newVarConfig_)
    // await rolesAuthority.setRoleCapability(0, newProxyAddr, '0xa2d4d48b', true); //disableEmitter()

    console.log('.');

    return [
        ozERC1967proxyAddr, 
        storageBeacon,
        emitter,
        emitterAddr,
        fakePYYaddr
    ];

}


async function storeVarsInHelpers(factory) {
    proxyFactory = factory;
}



module.exports = {
    getGasDetailsL2,
    deployContract,
    sendTx,
    getArbitrumParams,
    activateOzBeaconProxy,
    deploySystemOptimistically,
    getEventParam,
    sendETHv2,
    activateProxyLikeOps,
    compareTopicWith,
    deployAnotherStorageBeacon,
    createProxy,
    storeVarsInHelpers
};