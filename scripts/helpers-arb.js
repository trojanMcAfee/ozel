const diamond = require('diamond-util');
const assert = require('assert');
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
    defaultSlippage,
    nullAddr
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
        getOzelIndex: 'function getOzelIndex() returns (uint256)',
        getRegulatorCounter: 'function getRegulatorCounter() returns (uint256)',
        balanceOf: 'function balanceOf(address account) view returns (uint256)',
        transfer: 'function transfer(address recipient, uint256 amount) returns (bool)',
        exchangeToUserToken: 'function exchangeToUserToken(tuple(address user, address userToken, uint userSlippage) userDetails_)', 
        withdrawUserShare: 'function withdrawUserShare(tuple(address user, address userToken, uint userSlippage) userDetails_, address receiver, uint shares_)',
        enableWithdrawals: 'function enableWithdrawals(bool state_) external',
        updateExecutorState: 'function updateExecutorState(uint256 amount_, address user_, uint256 lockNum_) external payable',
        deposit: 'function deposit(uint256 assets, address receiver, uint256 lockNum_) external payable returns (uint256 shares)',
        executeFinalTrade: 'function executeFinalTrade(tuple(int128 tokenIn, int128 tokenOut, address baseToken, address userToken, address pool) swapDetails_, uint256 userSlippage, uint256 lockNum_) external payable',
        redeem: 'function redeem(uint256 shares, address receiver, address owner, uint256 lockNum_) external returns (uint256 assets)',
        burn: 'function burn(address account, uint256 amount, uint256 lockNum_) external',
        modifyPaymentsAndVolumeExternally: 'function modifyPaymentsAndVolumeExternally(address user_, uint256 newAmount_, uint256 lockNum_) external',
        addTokenToDatabase: 'function addTokenToDatabase(address newToken_) external',
        transferUserAllocation: 'function transferUserAllocation(address sender_, address receiver_, uint256 amount_, uint256 senderBalance_, uint256 lockNum_) external',
        diamondCut: 'function diamondCut(tuple(address facetAddress, uint8 action, bytes4[] functionSelectors)[] calldata _diamondCut, address _init, bytes calldata _calldata) external'
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
                    if (params.method === 'burn' || params.method === 'modifyPaymentsAndVolumeExternally' || params.method === 'addTokenToDatabase' || params.method === 'transferUserAllocation') {
                        callArgs = [...args];
                    } else {
                        callArgs.push(args);
                    }
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
                
                tx = await signer.sendTransaction(unsignedTx);
                return await tx.wait();
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
async function sendETH(userDetails, signerIndex = 0) {
    const value = ethers.utils.parseEther(signerIndex === '' ? '0' : '100');
    const receipt = await callDiamondProxy({
        method: 'exchangeToUserToken',
        args: userDetails, 
        value,
        signerIndex
    });
    return receipt;
}


async function getOzelIndex() {
    return await callDiamondProxy({
        method: 'getOzelIndex',
        dir: 1,
        type: 'uint256'
    });
}

async function addTokenToDatabase(token, signerIndex) {
    await callDiamondProxy({
        method: 'addTokenToDatabase',
        args: [token],
        signerIndex
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

async function getRegulatorCounter() {
    return await callDiamondProxy({
        method: 'getRegulatorCounter',
        dir: 1,
        type: 'uint256'
    });
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
        }
    }
    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddrArb);
    const WETH = await hre.ethers.getContractAt('IERC20', wethAddr);
    const WBTC = await hre.ethers.getContractAt('IERC20', wbtcAddr);
    const renBTC = await hre.ethers.getContractAt('IERC20', renBtcAddr);
    const [callerAddr] = await hre.ethers.provider.listAccounts();

    modContract = typeof contractName === 'string' ? await deployFacet(contractName) : contractName;
    faceCutArgs = [[ modContract.address, 1, [selector] ]]; 
    
    if (checkUSDTbalance) {
        balance = await USDT.balanceOf(callerAddr);
        assert.equal(balance, 0);
    };
    
    await callDiamondProxy({
        method: 'diamondCut',
        args: [faceCutArgs, nullAddr,'0x']
    });

    if (!isIndex) {
        receipt = await sendETH(userDetails); 
        testingNum = getTestingNumber(receipt);
        balance = await (whichERC20()).balanceOf(callerAddr);

        return {
            testingNum,
            balance,
            receipt
        };        
    }
}


//------ From deploy.js ---------

async function deployFacet(facetName) { 
    const Contract = await hre.ethers.getContractFactory(facetName);
    const contract = await Contract.deploy();
    await contract.deployed();
    console.log(`${facetName} deployed to: `, contract.address);
    return contract;
}



//Deploys contracts in Arbitrum
async function deploy(n = 0) { 
    function chooseFacet(m) {
        let facets = {ozel: 'OZLFacet', exec: 'ExecutorFacet'};
        switch(m) {
            case 0:
                return facets;
            case 1:
                facets.exec = 'ModExecutorFacet';
                break;
            case 2: 
                facets.ozel = 'ModOZLFacet';
                break;
            case 3: 
                facets.ozel = 'ModOZLFacet2';
                break;
            case 4: 
                facets.ozel = 'ModOZLFacet3';

        }
        return facets;
    }

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
    const ozlFacet = await deployFacet(chooseFacet(n).ozel);
    const gettersFacet = await deployFacet('GettersFacet');
    const executorFacet = await deployFacet(chooseFacet(n).exec);
    const oz4626 = await deployFacet('oz4626Facet');
    const oz20 = await deployFacet('oz20Facet');
    const ownershipFacet = await deployFacet('OwnershipFacet'); 

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
        executorFacet.address,
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
        defaultSlippage
    ];

    //Data structs for init()
    const VarsAndAddrStruct = [
        contractsAddr,
        erc20sAddr,
        tokensDatabase,
        appVars,
        [tokenName, tokenSymbol],
        ETH
    ];


    //Deploy DiamondInit
    const DiamondInit = await hre.ethers.getContractFactory('DiamondInit');
    const diamondInit = await DiamondInit.deploy();
    await diamondInit.deployed(); 
    const functionCall = diamondInit.interface.encodeFunctionData('init', [VarsAndAddrStruct]);

    //Deploys diamond
    const deployedDiamond = await diamond.deploy({
        diamondName: 'Diamond',
        facets: [
            ['DiamondCutFacet', diamondCutFacet],
            ['DiamondLoupeFacet', diamondLoupeFacet],
            [chooseFacet(n).ozel, ozlFacet],
            ['GettersFacet', gettersFacet],
            [chooseFacet(n).exec, executorFacet],
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
    getOzelIndex,
    callDiamondProxy,
    addTokenToDatabase,
    getRegulatorCounter,
    getTestingNumber,
    deployFacet,
    replaceForModVersion
};