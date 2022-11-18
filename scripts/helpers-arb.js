const myDiamondUtil = require('./myDiamondUtil.js');
const assert = require('assert');
const { defaultAbiCoder: abiCoder, formatEther, keccak256, toUtf8Bytes } = ethers.utils;

const {
    wethAddr,
    tricryptoAddr,
    usdtAddrArb,
    crvTricrypto,
    wbtcAddr,
    renBtcAddr,
    renPoolAddr,
    usdcAddr,
    mimAddr,
    fraxAddr,
    mimPoolAddr,
    crv2PoolAddr,
    yTricryptoPoolAddr,
    fraxPoolAddr,
    ETH,
    dappFee,
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
    ops
} = require('./state-vars.js');


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

async function withdrawShareOZL(userDetails, receiverAddr, balanceOZL, signerIndex = 0) {  
    const signers = await hre.ethers.getSigners();
    const signer = signers[signerIndex ? 0 : signerIndex];
    await OZLDiamond.connect(signer).withdrawUserShare(userDetails, receiverAddr, balanceOZL, ops);
} 


//Sends ETH to contracts (simulates ETH bridging) **** MAIN FUNCTION ****
async function sendETH(userDetails, signerIndex = 0, ozelIndex) {
    const signers = await hre.ethers.getSigners();
    const signer = signers[signerIndex ? 0 : signerIndex];
    let value = ethers.utils.parseEther(signerIndex === 'no value' ? '0' : '10');
    value = ozelIndex === 'ozel index test' ? ethers.utils.parseEther('100') : value;
    const tx = await OZLDiamond.connect(signer).exchangeToUserToken(userDetails, {
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

async function addTokenToDatabase(tokenSwap, signerIndex = 0) {
    const signers = await hre.ethers.getSigners();
    const signer = signers[signerIndex];
    await OZLDiamond.connect(signer).addTokenToDatabase(tokenSwap, ops);
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


async function replaceForModVersion(contractName, checkUSDTbalance, selector, userDetails, checkERC = false, isIndex = false) {
    function whichERC20() {
        switch(checkERC) {
            case true:
                return WETH;
            case false:
                return USDT;
            case 2:
                return WBTC;
            case 3:
                return renBTC;
            case 4:
                return MIM;
            case 5:
                return FRAX;
        }
    }
    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddrArb);
    const WETH = await hre.ethers.getContractAt('IERC20', wethAddr);
    const WBTC = await hre.ethers.getContractAt('IERC20', wbtcAddr);
    const renBTC = await hre.ethers.getContractAt('IERC20', renBtcAddr);
    const MIM = await hre.ethers.getContractAt('IERC20', mimAddr);
    const FRAX = await hre.ethers.getContractAt('IERC20', fraxAddr);
    const [callerAddr] = await hre.ethers.provider.listAccounts();
    let stringToHash;

    modContract = typeof contractName === 'string' ? await deployFacet(contractName) : contractName;
       
    if (contractName === 'ComputeRevenueV1' || contractName === 'ComputeRevenueV2' || contractName === 'ComputeRevenueV3') {
        const iface = new ethers.utils.Interface(diamondABI);
        const selectorTESTVAR = iface.getSighash('setTESTVAR2');
        let flag = false;

        try { 
            await OZLDiamond.diamondCut(
                [[ modContract.address, 0, [selectorTESTVAR] ]],
                nullAddr,
                '0x'
            );
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
            await OZLDiamond.setTESTVAR2(1, position);
        }
    }
    
    faceCutArgs = [[ modContract.address, 1, [selector] ]]; 
    
    if (checkUSDTbalance) {
        balance = await USDT.balanceOf(callerAddr);
        assert.equal(balance, 0);
    };

    await OZLDiamond.diamondCut(faceCutArgs, nullAddr, '0x');

    if (!isIndex) {
        receipt = await sendETH(userDetails); 
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
    let Contract;
    
    if (facetName === 'OZLFacet') {
        libCommon = await deployFacet('LibCommon');
        Contract = await hre.ethers.getContractFactory(facetName, {
            libraries: {
                LibCommon: libCommon.address
            }
        });
    } else {
        Contract = await hre.ethers.getContractFactory(facetName);
    }

    const contract = await Contract.deploy();
    await contract.deployed();
    console.log(`${facetName} deployed to: `, contract.address);
    return contract;
}



//Deploys contracts in Arbitrum
async function deploy(n = 0) { 
    const [callerAddr, caller2Addr] = await hre.ethers.provider.listAccounts();
    console.log('--');
    console.log('Caller 1: ', callerAddr);
    console.log('Caller 2: ', caller2Addr);
    console.log('--');

    const WETH = await hre.ethers.getContractAt('IERC20', wethAddr);
    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddrArb);
    const WBTC = await hre.ethers.getContractAt('IERC20', wbtcAddr);
    const renBTC = await hre.ethers.getContractAt('IERC20', renBtcAddr);
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
    const executorFacet = await deployFacet('ExecutorFacet');
    const oz4626 = await deployFacet('oz4626Facet');
    const oz20 = await deployFacet('oz20Facet');
    const ownershipFacet = await deployFacet('OwnershipFacet'); 
    const revenueFacet = await deployFacet('RevenueFacet');

    const contractsAddr = [
        tricryptoAddr,
        crvTricrypto,
        renPoolAddr,
        mimPoolAddr,
        crv2PoolAddr,
        yTricryptoPoolAddr,
        fraxPoolAddr,
        executorFacet.address,
        oz20.address,
        chainlinkAggregatorAddr,
        swapRouterUniAddr,
    ];

    const erc20sAddr = [
        usdtAddrArb,
        wbtcAddr,
        renBtcAddr,
        usdcAddr,
        mimAddr,
        wethAddr,
        fraxAddr,
    ];

    const tokensDatabase = [
        usdtAddrArb,
        usdcAddr,
        fraxAddr,
        wbtcAddr,
        mimAddr,
        renBtcAddr
    ];

    const appVars = [
        dappFee,
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

    if (n === 1) revenueAmounts[0] = 25;

    //Data structs for init()
    const VarsAndAddrStruct = [
        contractsAddr,
        erc20sAddr,
        tokensDatabase,
        appVars,
        ozlVars,
        ETH,
        revenueAmounts
    ];

    //Deploy DiamondInit
    const DiamondInit = await hre.ethers.getContractFactory('DiamondInit');
    const diamondInit = await DiamondInit.deploy();
    await diamondInit.deployed(); 
    const functionCall = diamondInit.interface.encodeFunctionData('init', [VarsAndAddrStruct]);

    //Deploys diamond
    const deployedDiamond = await myDiamondUtil.deploy({ 
        diamondName: 'Diamond',
        facets: [
            ['ozCutFacet', ozCutFacet],
            ['ozLoupeFacet', ozLoupeFacet],
            ['OZLFacet', ozlFacet],
            ['ExecutorFacet', executorFacet],
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
    console.log('Diamond deployed to: ', deployedDiamond.address);

    return {
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
    queryTokenDatabase
};