const diamond = require('diamond-util');
const { getSelectors } = require('./libraries/diamond.js');
const { defaultAbiCoder: abiCoder, formatEther } = ethers.utils;
const { MaxUint256 } = ethers.constants;

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
    defaultSlippage
} = require('./state-vars.js');


let deployedDiamond;
let ozlFacet;


function getVarsForHelpers(diamond, ozl) { 
    deployedDiamond = diamond;
    ozlFacet = ozl;
}

async function callDiamondProxy(params) { 
    const signers = await hre.ethers.getSigners();
    const signer = signers[!params.signerIndex ? 0 : params.signerIndex];
    const abi = [];
    let callArgs = [];
    let iface;
    let encodedData;
    let tx;
    let decodedData;
    let signature;
    const signatures = {
        getDistributionIndex: 'function getDistributionIndex() returns (uint256)',
        balanceOf: 'function balanceOf(address account) view returns (uint256)',
        transfer: 'function transfer(address recipient, uint256 amount) returns (bool)',
        exchangeToUserToken: 'function exchangeToUserToken(tuple(address user, address userToken, uint userSlippage) userDetails_)', 
        withdrawUserShare: 'function withdrawUserShare(tuple(address user, address userToken, uint userSlippage) userDetails_, address receiver, uint shares_)',
        enableWithdrawals: 'function enableWithdrawals(bool state_) external'
    }; 

    for (let sign in signatures) {
        if (sign === params.method) {
            signature = signatures[sign];
        }
    }
    abi.push(signature);
    iface = new ethers.utils.Interface(abi);


    switch(!params.dir ? 0 : params.dir) {
        case 0: 
           const args = params.args;
            switch(true) {
                case args.length === 2:
                    callArgs = [...args];
                    break;
                case typeof args[0] === 'object':
                    for (let i=0; i < args.length; i++) callArgs.push(args[i]);
                    break;
                default:
                    callArgs.push(args);
            }

            encodedData = iface.encodeFunctionData(params.method, callArgs);
            const unsignedTx = {
                to: deployedDiamond.address,
                data: encodedData,
                value: params.value
            };
            if (typeof params.args === 'string') { 
                tx = await signer.call(unsignedTx);
                [ decodedData ] = abiCoder.decode([params.type], tx);
                return decodedData;
            } else {
                if (iface.fragments[0].name === 'exchangeToUserToken') {
                    const estGas = await signer.estimateGas(unsignedTx);
                    unsignedTx.gasLimit = Math.floor(estGas.toString() * 1.10);
                }
                await signer.sendTransaction(unsignedTx);
                return;
            }
        case 1:
            encodedData = iface.encodeFunctionData(params.method);
            tx = await signer.sendTransaction({
                to: deployedDiamond.address,
                data: encodedData
            });
            const receipt = await tx.wait();
            const { data } = receipt.logs[0];
            [ decodedData ] = abiCoder.decode([params.type], data);
            return decodedData;
    }
}


async function enableWithdrawals(state) {
    await callDiamondProxy({
        method: 'enableWithdrawals',
        args: [state]
    });
}


async function balanceOfOZL(user) {
    const balance =  await callDiamondProxy({
        method: 'balanceOf',
        args: user,
        dir: 0,
        type: 'uint256'
    }); 
    return Number(formatEther(balance));
}

async function transferOZL(recipient, amount, signerIndex) { 
    await callDiamondProxy({
        method: 'transfer',
        args: [recipient, amount],
        signerIndex
    }); 
}

async function withdrawShareOZL(userDetails, receiverAddr, balanceOZL, signerIndex) {  
    await callDiamondProxy({
        method: 'withdrawUserShare',
        args: [userDetails, receiverAddr, balanceOZL],
        signerIndex
    });
} 


//Sends ETH to contracts (simulates ETH bridging) **** MAIN FUNCTION ****
async function sendETH(userDetails, signerIndex) {
    const value = ethers.utils.parseEther('100');
    await callDiamondProxy({
        method: 'exchangeToUserToken',
        args: userDetails, 
        value,
        signerIndex
    });
}


async function getDistributionIndex() {
    return await callDiamondProxy({
        method: 'getDistributionIndex',
        dir: 1,
        type: 'uint256'
    });
}



async function getCalldata(method, params) {
    const signatures = {
        exchangeToUserToken: 'function exchangeToUserToken(tuple(address user, address userToken, uint userSlippage) userDetails_)',
        sendToArb: 'function sendToArb(tuple(address user, address userToken, uint userSlippage) userDetails_, uint256 _callvalue) returns (uint256)'
    };
    const abi = [];
    abi.push(signatures[method]);
    const iface = new ethers.utils.Interface(abi);
    const data = iface.encodeFunctionData(method, params);
    return data;
} 


//------ From deploy.js ---------

async function deployFacet(facetName) { 
    const Contract = await hre.ethers.getContractFactory(facetName);
    const contract = await Contract.deploy();
    await contract.deployed();
    console.log(`${facetName} deployed to: `, contract.address);
    return contract;
}

function getSelectorsFromAllFacets(facets) { 
    const selectors = [];
    for (let i = 0; i < facets.length; i++) {
        selectors.push(getSelectors(facets[i]).filter((el) => typeof el === 'string'));
    }
    return selectors;
}



//Deploys contracts in Arbitrum
async function deploy() { 
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

    //Facets
    const diamondCutFacet = await deployFacet('DiamondCutFacet');
    const diamondLoupeFacet = await deployFacet('DiamondLoupeFacet'); 
    const ozlFacet = await deployFacet('OZLFacet');
    const gettersFacet = await deployFacet('GettersFacet');
    const executorF = await deployFacet('ExecutorF');
    const oz4626 = await deployFacet('oz4626Facet');
    const oz20 = await deployFacet('oz20Facet');
    const ownershipFacet = await deployFacet('OwnershipFacet'); 

    //Selectors
    const [
        selecCut,
        selecLoup,
        selecOZL,
        selectGetters,
        selectExecutor,
        select4626,
        select20,
        selectOwner
    ] = getSelectorsFromAllFacets([
        diamondCutFacet,
        diamondLoupeFacet,
        ozlFacet,
        gettersFacet,
        executorF,
        oz4626,
        oz20,
        ownershipFacet
    ]);

    const contractsAddr = [
        ozlFacet.address,
        tricryptoAddr,
        crvTricrypto,
        gettersFacet.address,
        renPoolAddr,
        mimPoolAddr,
        crv2PoolAddr,
        yTricryptoPoolAddr,
        fraxPoolAddr,
        executorF.address,
        oz4626.address,
        oz20.address
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

    const appVars = [
        dappFee,
        defaultSlippage
    ];

    //Data structs for init()
    const VarsAndAddrStruct = [
        contractsAddr,
        erc20sAddr,
        appVars,
        [tokenName, tokenSymbol],
        ETH
    ];

    const FacetsStruct = [
        [
            selecCut, 
            selecLoup, 
            selecOZL, 
            selectGetters,
            selectExecutor,
            select4626,
            select20,
            selectOwner
        ],
        [
            diamondCutFacet.address, 
            diamondLoupeFacet.address, 
            ozlFacet.address,
            gettersFacet.address,
            executorF.address,
            oz4626.address,
            oz20.address,
            ownershipFacet.address
        ]
    ];

    //Deploy DiamondInit
    const DiamondInit = await hre.ethers.getContractFactory('DiamondInit');
    const diamondInit = await DiamondInit.deploy();
    await diamondInit.deployed();
    const functionCall = diamondInit.interface.encodeFunctionData('init', [
        FacetsStruct,
        VarsAndAddrStruct
    ]);

    //Deploys diamond
    const deployedDiamond = await diamond.deploy({
        diamondName: 'Diamond',
        facets: [
            ['DiamondCutFacet', diamondCutFacet],
            ['DiamondLoupeFacet', diamondLoupeFacet],
            ['OZLFacet', ozlFacet],
            ['GettersFacet', gettersFacet],
            ['ExecutorF', executorF],
            ['oz4626Facet', oz4626],
            ['oz20Facet', oz20],
            ['OwnershipFacet', ownershipFacet]
        ],
        args: '',
        overrides: {callerAddr, functionCall, diamondInit: diamondInit.address}
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
        yvCrvTri
    };

}




module.exports = {
    balanceOfOZL,
    transferOZL,
    withdrawShareOZL,
    getVarsForHelpers,
    sendETH,
    getCalldata,
    enableWithdrawals,
    deploy,
    getDistributionIndex
};