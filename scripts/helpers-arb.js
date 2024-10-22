const myDiamondUtil = require('./myDiamondUtil.js');
const assert = require('assert');
const { ethers } = require('hardhat');

const { 
    defaultAbiCoder: abiCoder, 
    formatEther, 
    keccak256, 
    toUtf8Bytes,
    solidityPack,
    parseEther
} = ethers.utils;

const {
    wethAddr,
    tricryptoAddr,
    usdtAddrArb,
    crvTricrypto,
    wbtcAddr,
    usdcAddr,
    mimAddr,
    fraxAddr,
    mimPoolAddr,
    crv2PoolAddr,
    yTricryptoPoolAddr,
    fraxPoolAddr,
    ETH,
    protocolFee,
    tokenName,
    tokenSymbol,
    defaultSlippage,
    nullAddr,
    chainlinkAggregatorAddr,
    swapRouterUniAddr,
    poolFeeUni,
    revenueAmounts,
    diamondABI,
    usxAddr,
    ops,
    opsL2,
    tokensDatabaseL1,
    deadAddr,
    pokeMeOpsAddr,
    gelatoAddr,
    accountL2ABI
} = require('./state-vars.js');

const { deployContract } = require('./helpers-eth');
const { getSelectors } = require('./myDiamondUtil');


let deployedDiamond;
let ozlFacet;
let OZLDiamond;


async function getVarsForHelpers(diamond, ozl) { 
    deployedDiamond = diamond;
    ozlFacet = ozl;
    OZLDiamond = await hre.ethers.getContractAt(diamondABI, diamond.address);
}


async function enableWithdrawals(state) {
    await OZLDiamond.enableWithdrawals(state);
}


async function balanceOfOZL(user) {
    return Number(formatEther(await OZLDiamond.balanceOf(user)));
}

async function transferOZL(recipient, amount, signerIndex = 0) { 
    const signers = await hre.ethers.getSigners();
    const signer = signers[signerIndex];
    const tx = await OZLDiamond.connect(signer).transfer(recipient, amount);
    const receipt = await tx.wait();
    return receipt;
}

async function withdrawShareOZL(accountDetails, receiverAddr, balanceOZL, signerIndex = 0) {  
    const signers = await hre.ethers.getSigners();
    const signer = signers[signerIndex ? 0 : signerIndex];
    await OZLDiamond.connect(signer).withdrawUserShare(accountDetails, receiverAddr, balanceOZL, ops);
} 


//Sends ETH to contracts (simulates ETH bridging) **** MAIN FUNCTION ****
async function sendETH(accountDetails, signerIndex = 0, ozelIndex) {
    const signers = await hre.ethers.getSigners();
    const signer = signers[signerIndex === 0 || signerIndex === 'no value' ? 0 : signerIndex];
    let value = ethers.utils.parseEther(signerIndex === 'no value' ? '0' : '10');
    value = ozelIndex === 'ozel index test' ? ethers.utils.parseEther('100') : value;
    const tx = await OZLDiamond.connect(signer).exchangeToAccountToken(accountDetails, value, deadAddr, {
        value,
        gasLimit: ethers.BigNumber.from('5000000'),
        gasPrice: ethers.BigNumber.from('40134698068')
    });
    const receipt = await tx.wait();
    return receipt;
}


async function getOzelIndex() {
    return await OZLDiamond.getOzelIndex();
}

async function addTokenToDatabase(tokenSwap, token, signerIndex = 0) {
    const signers = await hre.ethers.getSigners();
    const signer = signers[signerIndex];
    await OZLDiamond.connect(signer).addTokenToDatabase(tokenSwap, token, ops);
}

async function addTokenToDatabaseAsOwner(tokenSwap, token) {
    const deployer2 = '0xe738696676571D9b74C81716E4aE797c2440d306';
    await sendETHOps('3', deployer2);

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [deployer2],
    });

    const deployerSigner = await hre.ethers.provider.getSigner(deployer2);
    await ozlDiamond.connect(deployerSigner).addTokenToDatabase(tokenSwap, token, ops);

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [deployer2],
    });
}

async function removeTokenFromDatabase(tokenSwap, token, signerIndex = 0) {
    const signers = await hre.ethers.getSigners();
    const signer = signers[signerIndex];
    if (ops.value) delete ops.value;
    await OZLDiamond.connect(signer).removeTokenFromDatabase(tokenSwap, token, ops);
}


async function removeTokenFromDatabaseAsOwner(tokenSwap, token) {
    const deployer2 = '0xe738696676571D9b74C81716E4aE797c2440d306';
    await sendETHOps('3', deployer2);

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [deployer2],
    });

    const deployerSigner = await hre.ethers.provider.getSigner(deployer2);
    await ozlDiamond.connect(deployerSigner).removeTokenFromDatabase(tokenSwap, token, ops);

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [deployer2],
    });
}


async function changeL1CheckAsOwner(state) {
    const deployer2 = '0xe738696676571D9b74C81716E4aE797c2440d306';
    await sendETHOps('3', deployer2);

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [deployer2],
    });

    const deployerSigner = await hre.ethers.provider.getSigner(deployer2);
    const tx = await ozlDiamond.connect(deployerSigner).changeL1Check(state, ops);
    await tx.wait();

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [deployer2],
    });
}


async function getRegulatorCounter() {
    return await OZLDiamond.getRegulatorCounter();
}


function getTestingNumber(receipt, isSecond = false) {
    const testNum = isSecond ? 24 : 23;
    topics = receipt.logs.map(log => log.topics);

    for (let i=0; i < topics.length; i++) { 
        num = topics[i].filter(hash => {
            val = Number(abiCoder.decode(['uint'], hash));
            if (val === testNum) return val;
        });
        if (Number(num) === testNum) return Number(num);
    }
}


async function replaceForModVersion(contractName, checkUSDTbalance, selector, accountDetails, checkERC = false, isIndex = false) {
    function whichERC20() {
        switch(checkERC) {
            case true:
                return WETH;
            case false:
                return USDT;
            case 2:
                return WBTC;
            case 3:
                return MIM;
            case 4:
                return FRAX;
            case 5:
                return USDC
        }
    }
    
    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddrArb);
    const WETH = await hre.ethers.getContractAt('IERC20', wethAddr);
    const WBTC = await hre.ethers.getContractAt('IERC20', wbtcAddr);
    const MIM = await hre.ethers.getContractAt('IERC20', mimAddr);
    const FRAX = await hre.ethers.getContractAt('IERC20', fraxAddr);
    const USDC = await hre.ethers.getContractAt('IERC20', usdcAddr);
    const [callerAddr] = await hre.ethers.provider.listAccounts();
    let stringToHash;

    modContract = typeof contractName === 'string' ? await deployFacet(contractName) : contractName;
       
    if (contractName === 'ComputeRevenueV1' || contractName === 'ComputeRevenueV2' || contractName === 'ComputeRevenueV3') {
        const iface = new ethers.utils.Interface(diamondABI);
        const selectorTESTVAR = iface.getSighash('setTESTVAR2');
        let flag = false;

        try { 
            const facet = await OZLDiamond.facetAddress(selectorTESTVAR);
            const action = facet === nullAddr ? 0 : 1;

            const tx = await OZLDiamond.diamondCut(
                [[ modContract.address, action, [selectorTESTVAR] ]],
                nullAddr,
                '0x'
            );
            await tx.wait();
        } catch {
            continueComputing();
            flag = true;
        }
        if (!flag) continueComputing();
        
        async function continueComputing() {
            if (contractName === 'ComputeRevenueV1') {
                stringToHash = 'testvar2.position';
            } else if (contractName === 'ComputeRevenueV2') {
                stringToHash = 'testvar2.second.position';
            } else if (contractName === 'ComputeRevenueV3') {
                stringToHash = 'testvar2.third.position';
            }

            let position = keccak256(toUtf8Bytes(stringToHash)); 
            const tx = await OZLDiamond.setTESTVAR2(1, position);
            await tx.wait();
        }
    }
    
    faceCutArgs = [[ modContract.address, 1, [selector] ]]; 
    
    if (checkUSDTbalance) {
        balance = await USDT.balanceOf(callerAddr);
        assert.equal(balance, 0);
    };

    await OZLDiamond.diamondCut(faceCutArgs, nullAddr, '0x', opsL2);

    if (!isIndex) {
        receipt = await sendETH(accountDetails); 
        testingNum = getTestingNumber(receipt);
        balance = await (whichERC20()).balanceOf(callerAddr);

        return {
            testingNum,
            balance,
            receipt,
            modContract
        };        
    }
}


async function queryTokenDatabase(token) {
    return await OZLDiamond.queryTokenDatabase(token, ops);
}


async function deployFacet(facetName) { 
    const Contract = await hre.ethers.getContractFactory(facetName);
    const contract = await Contract.deploy();
    await contract.deployed();
    console.log(`${facetName} deployed to: `, contract.address);
    return contract;
}

function getAccData(callerAddr, l1Address, slippage) {
    return solidityPack(['address','address','uint16'], [
        callerAddr,
        l1Address, 
        slippage
    ]);
}


async function sendETHWithAlias(accountDetails, j, ops, ozlDiamond) {
    const caller2AliasAddr = '0x81aa7970c51812dc3a010c7d01b50e0d17dc8ad9';
    const caller3AliasAddr = '0x4d55cdddb6a900fa2b585dd299e03d12fa42a4cd';
    const caller4AliasAddr = '0xa2089bf6eb2c4f870365e785982e1f101e93ca17';
    let callerInLine;
    const [signer] = await hre.ethers.getSigners();

    switch (j) {
        case 1:
            callerInLine = caller2AliasAddr;
            break;
        case 2:
            callerInLine = caller3AliasAddr;
            break;
        case 3:
            callerInLine = caller4AliasAddr;
            break;
    }

    let value = parseEther('200');
    ops.value = value;
    ops.to = callerInLine;
    await signer.sendTransaction(ops);
    delete ops.to;
    delete ops.value;
    value = parseEther('100');

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [callerInLine],
    });

    const callerAlias = await hre.ethers.provider.getSigner(callerInLine);
    ops.value = value;
    await ozlDiamond.connect(callerAlias).exchangeToAccountToken(accountDetails, value, deadAddr, ops);

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [caller2AliasAddr],
    });
}


function getInitSelectors() {
    const iface = new ethers.utils.Interface(accountL2ABI);
    const selectors = [];
    const methods = [
        'changeToken',
        'changeSlippage',
        'getDetails',
        'changeTokenNSlippage',
        'withdrawETH_lastResort',
        'initialize'
    ];

    for (let i=0; i < methods.length; i++) {
        selectors.push(iface.getSighash(methods[i]));
    }
    
    return selectors;
}


async function activateProxyLikeOpsL2(proxy, taskCreator, accData, isEvil, evilParams) {
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
    iface = new ethers.utils.Interface([`function exchangeToAccountToken(bytes,uint256,address)`]); 
    let execData;
    if (isEvil) {
        execData = iface.encodeFunctionData('sendToArb', evilParams);
    } else {
        execData = iface.encodeFunctionData('exchangeToAccountToken', [
            accData,
            ethers.FixedNumber.from('0.1'),
            proxy
        ]);
    }

    const tx = await ops.connect(gelatoSigner).exec(0, ETH, taskCreator, false, false, resolverHash, proxy, execData);
    const receipt = await tx.wait();
    // console.log('g: ', Number(receipt.gasUsed));

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [gelatoAddr],
    });

    return receipt;
}


async function sendETHOps(amount, receiver, data) {
    const [signer] = await hre.ethers.getSigners();
    ops.value = parseEther(amount);
    ops.to = receiver;
    
    tx = await signer.sendTransaction(ops);
    await tx.wait();
    
    delete ops.value;
    delete ops.to;
}


async function deployV1_1(ozlDiamond, deployer2) {

    //Deploys ozMiddleware
    ([ ozMiddlewareAddr, ozMiddleware ] = await deployContract('ozMiddlewareL2', [ozlDiamond.address]));

    //Deploys ozUpgradeableBeaconL2
    ([ beaconAddr, beacon ] = await deployContract('UpgradeableBeacon', [ ozMiddlewareAddr ]));

    //Deploys the ProxyFactory in L2
    let constrArgs = [beaconAddr];
    ([ factoryAddr, factory ] = await deployContract('ozProxyFactoryFacet', constrArgs));

    //Deploys ozLoupeFacetV1_1 in L2
    const newLoupe = await deployFacet('ozLoupeFacetV1_1');

    //Deploys the init upgrade
    const [ innitAddr, init ] = await deployContract('InitUpgradeV1_1');
    const functionCall = init.interface.encodeFunctionData('init', [getInitSelectors()]);

    //Adds factory and loupeV1.1 to ozDiamond
    facetCut = [
        [ factory.address, 0, getSelectors(factory) ],
        [ newLoupe.address, 0, getSelectors(newLoupe) ]
    ];

    const undoAliasAddrOzMiddleL2 = '0x842f1dc811bb5740090279ba06cfa8fcf6112667';

    if (!deployer2) {
        await ozlDiamond.diamondCut(facetCut, innitAddr, functionCall, ops);
        await ozlDiamond.setAuthorizedCaller(undoAliasAddrOzMiddleL2, true, ops);
    } else {
        await sendETHOps('3', deployer2);

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [deployer2],
        });

        const deployerSigner = await hre.ethers.provider.getSigner(deployer2);
        await ozlDiamond.connect(deployerSigner).diamondCut(facetCut, innitAddr, functionCall, ops);
        await ozlDiamond.connect(deployerSigner).setAuthorizedCaller(undoAliasAddrOzMiddleL2, true, ops);

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [deployer2],
        });
    }

    console.log('done setup...');

    return [ ozMiddleware, beacon ];
}


async function deployV1_2(ozlDiamond, isDeployer) {
    const deployer2 = '0xe738696676571D9b74C81716E4aE797c2440d306';
    let tx;

    //Deploys ozLoupeFacetV1_2
    const newLoupe = await deployFacet('ozLoupeFacetV1_2');

    //Deploys OZLFacetV1_2
    const newOZLFacet = await deployFacet('OZLFacetV1_2')

    //Deploys init upgrade
    const tokensDatabase = [
        usdtAddrArb,
        usdcAddr,
        mimAddr,
        fraxAddr,
        wbtcAddr
    ];

    const [ innitAddr, init ] = await deployContract('InitUpgradeV1_2');
    const functionCall = init.interface.encodeFunctionData('init', [tokensDatabase]);

    //Adds new facets to ozDiamond
    const facetCut = [
        [ newLoupe.address, 0, getSelectors(newLoupe) ],
        [ newOZLFacet.address, 1, getSelectors(newOZLFacet) ]
    ];

    if (isDeployer) {
        tx = await ozlDiamond.diamondCut(facetCut, innitAddr, functionCall);
        await tx.wait();
        console.log('done with deployer');
    } else {
        await sendETHOps('3', deployer2);

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [deployer2],
        });

        const deployerSigner = await hre.ethers.provider.getSigner(deployer2);
        await ozlDiamond.connect(deployerSigner).diamondCut(facetCut, innitAddr, functionCall, ops);

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [deployer2],
        });

        console.log ('done with impersonation');
    }

    return newOZLFacet.address;
}
 


//Deploys contracts in Arbitrum
async function deploy(n = 0) { 
    const addresses = await hre.ethers.provider.listAccounts();
    const [callerAddr, caller2Addr] = addresses;
    console.log('--');
    console.log('Caller 1: ', callerAddr);
    console.log('Caller 2: ', caller2Addr);
    console.log('--');

    const WETH = await hre.ethers.getContractAt('IERC20', wethAddr);
    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddrArb);
    const WBTC = await hre.ethers.getContractAt('IERC20', wbtcAddr);
    const USDC = await hre.ethers.getContractAt('IERC20', usdcAddr);
    const MIM = await hre.ethers.getContractAt('IERC20', mimAddr);
    const crvTri = await hre.ethers.getContractAt('IERC20', crvTricrypto);
    const yvCrvTri = await hre.ethers.getContractAt('IYtri', yTricryptoPoolAddr);
    const FRAX = await hre.ethers.getContractAt('IERC20', fraxAddr);
    const USX = await hre.ethers.getContractAt('IERC20', usxAddr);

    //Facets
    const ozCutFacet = await deployFacet('ozCutFacet');
    const ozLoupeFacet = await deployFacet('ozLoupeFacet');
    const ozlFacet = await deployFacet('OZLFacet');
    const executorFacet = await deployFacet('ozExecutorFacet');
    const oz4626 = await deployFacet('oz4626Facet');
    const oz20 = await deployFacet('oz20Facet');
    const ownershipFacet = await deployFacet('OwnershipFacet'); 
    const revenueFacet = await deployFacet('RevenueFacet');

    const contractsAddr = [
        tricryptoAddr,
        crvTricrypto,
        mimPoolAddr,
        crv2PoolAddr,
        yTricryptoPoolAddr,
        fraxPoolAddr,
        executorFacet.address,
        oz20.address,
        chainlinkAggregatorAddr,
        swapRouterUniAddr
    ];

    const erc20sAddr = [
        usdtAddrArb,
        wbtcAddr,
        usdcAddr,
        mimAddr,
        wethAddr,
        fraxAddr,
    ];

    const tokensDatabase = [
        [tokensDatabaseL1.usdtAddr, usdtAddrArb],
        [tokensDatabaseL1.usdcAddr, usdcAddr],
        [tokensDatabaseL1.fraxAddr, fraxAddr],
        [tokensDatabaseL1.wbtcAddr, wbtcAddr],
        [tokensDatabaseL1.mimAddr, mimAddr]
    ];

    const appVars = [
        protocolFee,
        defaultSlippage,
        poolFeeUni
    ];

    const ozlVars = [tokenName, tokenSymbol];

    const nonRevenueFacets = [ 
        ozCutFacet.address,
        ozLoupeFacet.address,
        ownershipFacet.address,
        revenueFacet.address
    ];

    if (n === 1) revenueAmounts[0] = 12;

    //Data structs for init()
    const VarsAndAddrStruct = [
        contractsAddr,
        erc20sAddr,
        tokensDatabase,
        ETH,
        appVars,
        revenueAmounts,
        ozlVars
    ];

    //Deploy DiamondInit
    const DiamondInit = await hre.ethers.getContractFactory('DiamondInit');
    const diamondInit = await DiamondInit.deploy();
    await diamondInit.deployed(); 
    const functionCall = diamondInit.interface.encodeFunctionData('init', [VarsAndAddrStruct]);

    //Deploys diamond
    const deployedDiamond = await myDiamondUtil.deploy({ 
        diamondName: 'ozDiamond',
        facets: [
            ['ozCutFacet', ozCutFacet],
            ['ozLoupeFacet', ozLoupeFacet],
            ['OZLFacet', ozlFacet],
            ['ozExecutorFacet', executorFacet],
            ['oz4626Facet', oz4626],
            ['oz20Facet', oz20],
            ['OwnershipFacet', ownershipFacet],
            ['RevenueFacet', revenueFacet]
        ],
        args: '',
        overrides: {
            callerAddr, functionCall, diamondInit: diamondInit.address, nonRevenueFacets
        }
    });
    console.log('ozDiamond deployed to: ', deployedDiamond.address);

    const ozMiddlewareAddr = '0xe28ed6e51aad88f6f4ce6ab8827279cfffb91155'; 
    const ozlDiamond = await hre.ethers.getContractAt(diamondABI, deployedDiamond.address);
    await ozlDiamond.setAuthorizedCaller(ozMiddlewareAddr, true, ops);
    console.log('ozMiddleware authorized...');

    return {
        deployedDiamond, 
        WETH,
        USDT,
        WBTC,
        USDC,
        MIM,
        FRAX,
        crvTri,
        callerAddr, 
        caller2Addr,
        ozlFacet,
        yvCrvTri,
        USX
    };

}





module.exports = {
    balanceOfOZL,
    transferOZL,
    withdrawShareOZL,
    getVarsForHelpers,
    sendETH,
    enableWithdrawals,
    deploy,
    getOzelIndex,
    addTokenToDatabase,
    getRegulatorCounter,
    getTestingNumber,
    deployFacet,
    replaceForModVersion,
    queryTokenDatabase,
    removeTokenFromDatabase,
    getAccData,
    sendETHWithAlias,
    activateProxyLikeOpsL2,
    getInitSelectors,
    deployV1_1,
    sendETHOps,
    deployV1_2,
    addTokenToDatabaseAsOwner,
    removeTokenFromDatabaseAsOwner,
    changeL1CheckAsOwner
};