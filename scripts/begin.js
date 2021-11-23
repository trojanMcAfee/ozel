const { Bitcoin } = require("@renproject/chains");
const { ethers } = require("ethers");
const { executeBridge } = require('./exec-bridge.js');
const { sendBitcoin } = require('./init-btc-tx.js');
const { MaxUint256 } = ethers.constants;
const { parseEther, formatEther, keccak256, defaultAbiCoder: abiCoder } = ethers.utils;

let wethAddr;
let wbtcAddr;
let renBtcAddr;
let registryAddr;
let renPoolAddr;
let tricryptoAddr;
let usdtAddr;
// let crvRenWBTC;
let crvTricrypto;
const ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const dappFee = 10; //prev: 10 -> 0.1% / 100-1 / 1000-10 / 10000 - 100%
const slippageOnCurve = 100; //bp: 100 -> 1%

let network = 'mainnet'; 
if (network === 'mainnet') {
    registryAddr = '0x557e211EC5fc9a6737d2C6b7a1aDe3e0C11A8D5D';
    renPoolAddr = '0x93054188d876f558f4a66B2EF1d97d16eDf0895B';
    tricryptoAddr = '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46';
    renBtcAddr = '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D';
    wbtcAddr = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
    wethAddr = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    usdtAddr = '0xdac17f958d2ee523a2206206994597c13d831ec7';
    // crvRenWBTC = '0x49849c98ae39fff122806c06791fa73784fb3675';
    crvTricrypto = '0xc4AD29ba4B3c580e6D59105FFf484999997675Ff';
} else if (network === 'arbitrum') {
    registryAddr = '0x21C482f153D0317fe85C60bE1F7fa079019fcEbD';
    renPoolAddr = '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb';
    tricryptoAddr = '0x960ea3e3C7FB317332d990873d354E18d7645590';
    renBtcAddr = '0xdbf31df14b66535af65aac99c32e9ea844e14501';
    wbtcAddr = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f';
    wethAddr = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';
    usdtAddr = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';
    // crvRenWBTC;
    crvTricrypto = '0x8e0B8c8BB9db49a46697F3a5Bb8A308e744821D2';
}



const amountToSend = 0.002;

//Variables that are supposed to be dynamically created
const sendingAddr = 'mubUbyPazdyvhPJYPGWUkFWj7bkw1Yq8ys';
const senderPK = process.env.PK_TEST;


async function begin() { //KOVAN
    const wethAddr = '0xd0A1E359811322d97991E03f863a0C30C2cF029C';
    const usdtAddr = '0xf3e0d7bf58c5d455d31ef1c2d5375904df525105';
    const [userAddr] = await hre.ethers.provider.listAccounts();
    const userToken = usdtAddr;
    
    //Creates the "mint" object for bridge execution
    const mint = await executeBridge(userAddr, userToken); 

    //Gets the BTC gateway deposit address
    const depositAddress = mint.gatewayAddress;
    console.log('BTC deposit address: ', depositAddress);

    //Sends the deposited BTC to the bridge deposit address
    await sendBitcoin(depositAddress, amountToSend, sendingAddr, senderPK);
    
    //Mints renBTC
    await mint.on('deposit', async (deposit) => {
        const hash = deposit.txHash();
        console.log('first hash: ', hash);
        console.log('details of deposit: ', deposit.depositDetails);

        const depositLog = (msg) => {
            console.log(
                `BTC deposit: ${Bitcoin.utils.transactionExplorerLink(
                    deposit.depositDetails.transaction,
                    'testnet'
                )}\n
                RenVM Hash: ${hash}\n
                Status: ${deposit.status}\n
                ${msg}`
            );
        }

        await deposit.confirmed()
            .on('target', (target) => depositLog(`0/${target} confirmations`))
            .on('confirmation', (confs, target) => 
            depositLog(`${confs}/${target} confirmations`)
        );

        await deposit.signed()
            .on("status", (status) => depositLog(`Status: ${status}`));
            
        await deposit
            .mint()
            .on('transactionHash', async (txHash) => {
                console.log('Ethereum transaction: ', txHash.toString());
            }); 
        console.log(`Deposited ${amountToSend} BTC`);
    });

}



async function simulate() {
    const [callerAddr, caller2Addr] = await hre.ethers.provider.listAccounts();
    console.log('Caller 1: ', callerAddr);
    console.log('Caller 2: ', caller2Addr);

    const WETH = await hre.ethers.getContractAt('IERC20', wethAddr);
    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddr);
    const WBTC = await hre.ethers.getContractAt('IERC20', wbtcAddr);
    const renBTC = await hre.ethers.getContractAt('IERC20', renBtcAddr);

    //Deploys Helpers library
    const Helpers = await hre.ethers.getContractFactory('Helpers');
    const helpers = await Helpers.deploy();
    await helpers.deployed();

    //Deploys Vault
    const Vault = await hre.ethers.getContractFactory('Vault', {
        libraries: {
            Helpers: helpers.address
        }
    });
    const vault = await Vault.deploy();
    await vault.deployed();
    console.log('Vault deployed to: ', vault.address);
   
    //Deploys Manager
    const Manager = await hre.ethers.getContractFactory('Manager', {
        libraries: {
            Helpers: helpers.address
        }
    });
    const manager = await Manager.deploy(
        vault.address,
        renPoolAddr,
        tricryptoAddr,
        renBtcAddr,
        usdtAddr,
        wethAddr,
        wbtcAddr
    );
    await manager.deployed();
    console.log('Manager deployed to: ', manager.address);
    await vault.setManager(manager.address);
    
    //Deploys PayMe
    const PayMe = await hre.ethers.getContractFactory("PayMe");
    const payme = await PayMe.deploy(registryAddr, manager.address, renBtcAddr);
    await payme.deployed();
    console.log("PayMe deployed to:", payme.address);

    //Deploys PayToken (PYY)
    const pyy = await hre.ethers.getContractFactory('PayToken');
    const PYY = await pyy.deploy(manager.address);
    await PYY.deployed();
    console.log('PayToken deployed to: ', PYY.address);

    await manager.setPYY(PYY.address);
    await vault.setPYY(PYY.address);

    console.log('---------------------------------------');




    /**+++++++++ SIMULATES CURVE SWAPS ++++++++**/
    const IWETH = await hre.ethers.getContractAt('IWETH', wethAddr);
    const tricryptoPool = await hre.ethers.getContractAt('ITricrypto', tricryptoAddr);
    const renPool = await hre.ethers.getContractAt('IRenPool', renPoolAddr);

    //Gets the gross WETH and converts to WBTC
    await IWETH.deposit({value: parseEther('1000')}); 
    let amountIn = (await WETH.balanceOf(callerAddr)).toString(); 
    //Swaps ETH for WBTC
    await tricryptoPool.exchange(2, 1, amountIn, 1, true, {
        value: amountIn
    });

    //Converts to renBTC and divides in 1/10th
    amountIn = (await WBTC.balanceOf(callerAddr)).toString();
    await WBTC.approve(renPoolAddr, MaxUint256);
    await renPool.exchange(1, 0, amountIn, 1); 
    let renBtcBalance = (await renBTC.balanceOf(callerAddr)).toString();
    let oneTenth = Math.floor(renBtcBalance / 10);

    //Sends renBTC to contracts (simulates BTC bridging) ** MAIN FUNCTION **
    async function sendsOneTenthRenBTC(caller, userToken, IERC20, tokenStr, decimals) {
        await renBTC.transfer(payme.address, oneTenth);
        await payme.transferToManager(
            manager.address,
            caller,
            userToken
        );
        console.log('index: ', (await manager.distributionIndex()).toString() / 10 ** 18);
        let tokenBalance = await IERC20.balanceOf(caller);
        console.log(tokenStr + ' balance of callerAddr: ', tokenBalance.toString() / decimals);
        console.log('---------------------------------------'); 
    }

    async function approvePYY(caller) {
        const signer = await hre.ethers.provider.getSigner(caller);
        await PYY.connect(signer).approve(manager.address, MaxUint256);
    }
    //Caller 2 signer
    const signer2 = await hre.ethers.provider.getSigner(caller2Addr);

    //First user
    console.log('1st user first transfer');
    await sendsOneTenthRenBTC(callerAddr, usdtAddr, USDT, 'USDT', 10 ** 6);
    await approvePYY(callerAddr);
    console.log('PYY balance on caller 1: ', formatEther(await PYY.balanceOf(callerAddr)));
    console.log('---------------------------------------'); 

    //Second user
    console.log('2nd user first transfer');
    await sendsOneTenthRenBTC(caller2Addr, wethAddr, WETH, 'WETH', 10 ** 18);
    await approvePYY(caller2Addr);
    console.log('PYY balance on caller 2: ', formatEther(await PYY.balanceOf(caller2Addr)));
    console.log('PYY balance on caller 1 after caller2 swap: ', formatEther(await PYY.balanceOf(callerAddr)));
    console.log('---------------------------------------'); 

    // //First user - 2nd transfer
    console.log('1st user second transfer');
    await sendsOneTenthRenBTC(callerAddr, usdtAddr, USDT, 'USDT', 10 ** 6);
    console.log('PYY balance on caller 1 after 2nd swap: ', formatEther(await PYY.balanceOf(callerAddr)));
    console.log('PYY balance on caller 2 after caller1 2nd swap: ', formatEther(await PYY.balanceOf(caller2Addr)));
    console.log('---------------------------------------'); 
    
    //Transfer half of PYY from caller1 to caller2
    console.log('Transfer half of PYY');
    const halfPYYbalance = formatEther(await PYY.balanceOf(callerAddr)) / 2;
    await PYY.transfer(caller2Addr, parseEther(halfPYYbalance.toString())); 
    console.log('PYY balance on caller 1 after transferring half: ', formatEther(await PYY.balanceOf(callerAddr)));
    console.log('PYY balance on caller 2 after getting half: ', formatEther(await PYY.balanceOf(caller2Addr)));
    console.log('---------------------------------------'); 

    //1st user withdraw remaining share (half)
    console.log('Withdraw 1st user half share');
    await vault.withdrawUserShare(callerAddr, parseEther(formatEther(await PYY.balanceOf(callerAddr))), usdtAddr);
    const usdtBalance = await USDT.balanceOf(callerAddr);
    console.log('USDT balance from fees of caller1: ', usdtBalance.toString() / 10 ** 6); 
    console.log('PYY balance on caller 1 after fees withdrawal: ', formatEther(await PYY.balanceOf(callerAddr)));
    console.log('PYY balance on caller 2 after fees withdrawal ', formatEther(await PYY.balanceOf(caller2Addr)));
    console.log('---------------------------------------'); 

    //1st user third transfer (ETH)
    console.log('1st user third transfer (ETH)');
    await sendsOneTenthRenBTC(callerAddr, wethAddr, WETH, 'WETH', 10 ** 18);
    console.log('PYY balance on caller 1: ', formatEther(await PYY.balanceOf(callerAddr)));
    console.log('PYY balance on caller 2: ', formatEther(await PYY.balanceOf(caller2Addr)));
    const toTransfer = formatEther(await PYY.balanceOf(caller2Addr)) / 3;
    await PYY.connect(signer2).transfer(callerAddr, parseEther(toTransfer.toString())); 
    console.log('After PYY transfer');
    console.log('PYY balance on caller 1: ', formatEther(await PYY.balanceOf(callerAddr)));
    console.log('PYY balance on caller 2: ', formatEther(await PYY.balanceOf(caller2Addr)));
    console.log('Withdrawing 1/3');
    await vault.withdrawUserShare(caller2Addr, parseEther(toTransfer.toString()), wethAddr);
    const wethBalance = await WETH.balanceOf(caller2Addr);
    console.log('WETH balance from fees of caller2: ', formatEther(wethBalance));
    console.log('PYY balance on caller 1: ', formatEther(await PYY.balanceOf(callerAddr)));
    console.log('PYY balance on caller 2: ', formatEther(await PYY.balanceOf(caller2Addr)));


    /**+++++++++ END OF SIMULATION CURVE SWAPS ++++++++**/

}


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


async function diamond() {

    const { getSelectors, FacetCutAction } = require('./libraries/diamond.js');

    const signers = await hre.ethers.getSigners();
    const signer1 = signers[0];
    const callerAddr = signer1.address;
    console.log('caller1: ', callerAddr);

    //Deploys DiamondCutFacet
    const DiamondCutFacet = await hre.ethers.getContractFactory('DiamondCutFacet');
    const diamondCutFacet = await DiamondCutFacet.deploy();
    await diamondCutFacet.deployed();
    console.log('DiamondCutFacet deployed to: ', diamondCutFacet.address);

    //Deploys Diamond
    const Diamond = await hre.ethers.getContractFactory('Diamond');
    const diamond = await Diamond.deploy(callerAddr, diamondCutFacet.address);
    await diamond.deployed();
    console.log('Diamond deployed to: ', diamond.address);  

    //Deploys DiamondInit
    const DiamondInit = await hre.ethers.getContractFactory('DiamondInit');
    const diamondInit = await DiamondInit.deploy();
    await diamondInit.deployed();
    console.log('DiamondInit deployed to: ', diamondInit.address);

    //Deploy Facets
    console.log('');
    console.log('Deploying Facets');
    const FacetNames = [
        'DiamondLoupeFacet',
        'DummyFacet'
    ];

    const cut = [];
    const FacetsContracts = [];
    for (let FacetName of FacetNames) {
        const Facet = await hre.ethers.getContractFactory(FacetName);
        const facet = await Facet.deploy();
        await facet.deployed();
        FacetsContracts.push(facet);
        console.log(`${FacetName} deployed to: ${facet.address}`);
        cut.push({
            facetAddress: facet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(facet)
        });
    }

    const selecLoup = getSelectors(FacetsContracts[0]).filter((el, i) => i <= 4);
    const selecDummy = getSelectors(FacetsContracts[1]).filter((el, i) => i <= 1);
    const selectors = [...selecLoup, ...selecDummy];
    console.log('selectors: ', selectors);
    const facetAddresses = [FacetsContracts[0].address, FacetsContracts[1].address];

    //Upgrade Diamond with Facets
    console.log('');
    console.log('Diamond cut: ', cut);
    const diamondCut = await hre.ethers.getContractAt('IDiamondCut', diamond.address);
    let tx;
    let receipt;
    // call to the init function
    let functionCall = diamondInit.interface.encodeFunctionData('init', [
        selectors, 
        facetAddresses
    ]);
    tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall);
    console.log('Diamond cut tx: ', tx.hash);
    receipt = await tx.wait();
    if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`);
    }
    console.log('Completed diamond cut');
    // return diamond.address;

    
    //Interacts with facets
    const [ diamondLoupeFacet, dummyFacet ] = FacetsContracts;
    // await diamond.getHello();
    await diamond.getOwner();

}



async function diamond2() {
    const diamond = require('diamond-util');
    const { getSelectors } = require('./libraries/diamond.js');

    const [callerAddr, caller2Addr] = await hre.ethers.provider.listAccounts();
    console.log('--');
    console.log('Caller 1: ', callerAddr);
    console.log('Caller 2: ', caller2Addr);
    console.log('--');

    const WETH = await hre.ethers.getContractAt('IERC20', wethAddr);
    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddr);
    const WBTC = await hre.ethers.getContractAt('IERC20', wbtcAddr);
    const renBTC = await hre.ethers.getContractAt('IERC20', renBtcAddr);
    const crvTri = await hre.ethers.getContractAt('IERC20', crvTricrypto);

    async function deployFacet(facetName, withLib, libDeployed) {
        let Contract, library;
        if (withLib) {
            library = !libDeployed ? await deployFacet(withLib) : libDeployed;
            const lb = {};
            lb[withLib] = library.address;
            Contract = await hre.ethers.getContractFactory(facetName, {
                libraries: lb
            });
        } else {
            Contract = await hre.ethers.getContractFactory(facetName);
        }
        const contract = await Contract.deploy();
        await contract.deployed();
        console.log(`${facetName} deployed to: `, contract.address);
        return withLib && !libDeployed ? [contract, library] : contract;
    }

    //Facets
    const diamondCutFacet = await deployFacet('DiamondCutFacet');
    const diamondLoupeFacet = await deployFacet('DiamondLoupeFacet'); 
    const dummyFacet = await deployFacet('DummyFacet');
    
    const [managerFacet, library] = await deployFacet('ManagerFacet', 'Helpers');
    const vaultFacet = await deployFacet('VaultFacet', 'Helpers', library);
    const paymeFacet = await deployFacet('PayMeFacet');
    const PYY = await deployFacet('PayTokenFacet'); 

    const gettersFacet = await deployFacet('GettersFacet');

    //Selectors
    const selecCut = getSelectors(diamondCutFacet).filter((el) => typeof el === 'string');
    const selecLoup = getSelectors(diamondLoupeFacet).filter((el) => typeof el === 'string');
    const selecDummy = getSelectors(dummyFacet).filter((el) => typeof el === 'string');
    
    const selecPayme = getSelectors(paymeFacet).filter((el) => typeof el === 'string');
    const selecManager = getSelectors(managerFacet).filter((el) => typeof el === 'string');
    const selecPYY = getSelectors(PYY).filter((el) => typeof el === 'string');

    const selectGetters = getSelectors(gettersFacet).filter((el) => typeof el === 'string');


    //State variables
    const tokenName = 'PayToken';
    const tokenSymbol = 'PYY';
    
    const contractsAddr = [
        registryAddr,
        managerFacet.address,
        tricryptoAddr,
        vaultFacet.address,
        renPoolAddr,
        crvTricrypto,
        paymeFacet.address,
        gettersFacet.address
    ];

    const erc20sAddr = [
        renBtcAddr,
        usdtAddr,
        wethAddr,
        wbtcAddr,
        PYY.address
    ];
    
    const appVars = [
        dappFee,
        slippageOnCurve
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
            selecDummy, 
            selecPayme, 
            selecManager, 
            selecPYY,
            selectGetters
        ],
        [
            diamondCutFacet.address, 
            diamondLoupeFacet.address, 
            dummyFacet.address,
            paymeFacet.address,
            managerFacet.address,
            PYY.address,
            gettersFacet.address
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
            ['DummyFacet', dummyFacet],
            ['PayMeFacet', paymeFacet],
            ['ManagerFacet', managerFacet],
            ['PayTokenFacet', PYY],
            ['GettersFacet', gettersFacet]
        ],
        args: '',
        overrides: {callerAddr, functionCall, diamondInit: diamondInit.address}
    });
    console.log('Diamond deployed to: ', deployedDiamond.address);

    


    //-----Helpers func--------//
    async function callDiamondProxy(method, args, dir = 0, type = '') {
        const signers = await hre.ethers.getSigners();
        const signer = signers[0];
        const abi = [];
        let iface;
        let encodedData;
        const callArgs = [];
        let tx;
        let decodedData;
        let signature;
        const signatures = {
            transferToManager: 'function transferToManager(address _user, address _userToken)', //delete if not used
            getDistributionIndex: 'function getDistributionIndex() returns (uint256)',
            balanceOf: 'function balanceOf(address account) view returns (uint256)',
            transfer: 'function transfer(address recipient, uint256 amount) returns (bool)',
            exchangeToUserToken: 'function exchangeToUserToken(uint _amount, address _user, address _userToken)',
            withdrawUserShare: 'function withdrawUserShare(address _user, uint _userAllocation, address _userToken)'
        };

        for (let sign in signatures) {
            if (sign === method) {
                signature = signatures[sign];
            }
        }
        abi.push(signature);
        iface = new ethers.utils.Interface(abi);
        // console.log('iface: ', iface.fragments[0].name);
        if (Object.keys(args).length < 2) {
            callArgs[0] = args[Object.keys(args)[0]];
        } else {
            let i = 0;
            for (let key in args) {
                callArgs[i] = args[key];
                i++;
            }
        }

        switch(dir) {
            case 0: 
                encodedData = iface.encodeFunctionData(method, callArgs);
                const unsignedTx = {
                    to: deployedDiamond.address,
                    data: encodedData
                };
                if (callArgs.length === 1) {
                    tx = await signer.call(unsignedTx);
                    [ decodedData ] = abiCoder.decode([type], tx);
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
                encodedData = iface.encodeFunctionData(method);
                tx = await signer.sendTransaction({
                    to: deployedDiamond.address,
                    data: encodedData
                });
                const receipt = await tx.wait();
                const { data } = receipt.logs[0];
                [ decodedData ] = abiCoder.decode([type], data);
                return decodedData;
        }
    }

    async function balanceOfPYY(user) {
        return await callDiamondProxy(
            'balanceOf',
            {user},
            0,
            'uint256'
        ); 
    }

    async function transferPYY(recipient, amount) {
        await callDiamondProxy(
            'transfer',
            {recipient, amount},
        ); 
    }
    //-----Helpers func--------//



    
    /**+++++++++ SIMULATES CURVE SWAPS ++++++++**/
    const IWETH = await hre.ethers.getContractAt('IWETH', wethAddr);
    const tricryptoPool = await hre.ethers.getContractAt('ITricrypto', tricryptoAddr);
    const renPool = await hre.ethers.getContractAt('IRenPool', renPoolAddr);

    //Gets the gross WETH and converts to WBTC
    await IWETH.deposit({value: parseEther('1000')}); 
    let amountIn = (await WETH.balanceOf(callerAddr)).toString(); 
    //Swaps ETH for WBTC
    await tricryptoPool.exchange(2, 1, amountIn, 1, true, {
        value: amountIn
    });

    //Converts to renBTC and divides in 1/10th
    amountIn = (await WBTC.balanceOf(callerAddr)).toString();
    await WBTC.approve(renPoolAddr, MaxUint256);
    await renPool.exchange(1, 0, amountIn, 1); 
    let renBtcBalance = (await renBTC.balanceOf(callerAddr)).toString();
    let oneTenth = Math.floor(renBtcBalance / 10);

    //Sends renBTC to contracts (simulates BTC bridging) ** MAIN FUNCTION **
    async function sendsOneTenthRenBTC(userAddr, userToken, IERC20, tokenStr, decimals) {
        await renBTC.transfer(deployedDiamond.address, oneTenth);
        const balanceRenBTC = await renBTC.balanceOf(deployedDiamond.address);
        await callDiamondProxy(
            'exchangeToUserToken',
            {balanceRenBTC, userAddr, userToken}
        );

        const distributionIndex = await callDiamondProxy(
            'getDistributionIndex',
            '',
            1,
            'uint256'
        );
        console.log('index: ', distributionIndex.toString() / 10 ** 18);
        let tokenBalance = await IERC20.balanceOf(userAddr);
        console.log(tokenStr + ' balance of callerAddr: ', tokenBalance.toString() / decimals);
        console.log('.'); 
    }
    
    async function approvePYY(caller) {
        const signer = await hre.ethers.provider.getSigner(caller);
        await PYY.connect(signer).approve(managerFacet.address, MaxUint256);
    }
    //Caller 2 signer
    const signer2 = await hre.ethers.provider.getSigner(caller2Addr);

    //First user
    console.log('1st user first transfer');
    await sendsOneTenthRenBTC(callerAddr, usdtAddr, USDT, 'USDT', 10 ** 6);
    await approvePYY(callerAddr);
    console.log('PYY balance on caller 1: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('crvTricrypto token balance on diamondProxy: ', formatEther(await crvTri.balanceOf(deployedDiamond.address)));
    console.log('---------------------------------------'); 

    //Second user
    console.log('2nd user first transfer');
    await sendsOneTenthRenBTC(caller2Addr, wethAddr, WETH, 'WETH', 10 ** 18);
    await approvePYY(caller2Addr);
    console.log('PYY balance on caller 2: ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('PYY balance on caller 1 after caller2 swap: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('crvTricrypto token balance on diamondProxy: ', formatEther(await crvTri.balanceOf(deployedDiamond.address)));
    console.log('---------------------------------------'); 

    // //First user - 2nd transfer
    console.log('1st user second transfer'); 
    await sendsOneTenthRenBTC(callerAddr, usdtAddr, USDT, 'USDT', 10 ** 6);
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
    console.log('Withdraw 1st user half share'); 
    // await vault.withdrawUserShare(callerAddr, parseEther(formatEther(await balanceOfPYY(callerAddr))), usdtAddr);
    async function withdrawSharePYY(callerAddr, balancePYY, usdtAddr) {
        await callDiamondProxy(
            'withdrawUserShare',
            {
                callerAddr,
                balancePYY,
                usdtAddr
            }
            );
        }
        
    await withdrawSharePYY(callerAddr, parseEther(formatEther(await balanceOfPYY(callerAddr))), usdtAddr);


    const usdtBalance = await USDT.balanceOf(callerAddr);
    console.log('USDT balance from fees of caller1: ', usdtBalance.toString() / 10 ** 6); 
    console.log('PYY balance on caller 1 after fees withdrawal: ', formatEther(await balanceOfPYY(callerAddr)));
    console.log('PYY balance on caller 2 after fees withdrawal ', formatEther(await balanceOfPYY(caller2Addr)));
    console.log('---------------------------------------'); 


    console.log('begin: revert here');
    return;



    //1st user third transfer (ETH)
    console.log('1st user third transfer (ETH)');
    await sendsOneTenthRenBTC(callerAddr, wethAddr, WETH, 'WETH', 10 ** 18);
    console.log('PYY balance on caller 1: ', formatEther(await PYY.balanceOf(callerAddr)));
    console.log('PYY balance on caller 2: ', formatEther(await PYY.balanceOf(caller2Addr)));
    const toTransfer = formatEther(await PYY.balanceOf(caller2Addr)) / 3;
    await PYY.connect(signer2).transfer(callerAddr, parseEther(toTransfer.toString())); 
    console.log('After PYY transfer');
    console.log('PYY balance on caller 1: ', formatEther(await PYY.balanceOf(callerAddr)));
    console.log('PYY balance on caller 2: ', formatEther(await PYY.balanceOf(caller2Addr)));
    console.log('Withdrawing 1/3');
    await vault.withdrawUserShare(caller2Addr, parseEther(toTransfer.toString()), wethAddr);
    const wethBalance = await WETH.balanceOf(caller2Addr);
    console.log('WETH balance from fees of caller2: ', formatEther(wethBalance));
    console.log('PYY balance on caller 1: ', formatEther(await PYY.balanceOf(callerAddr)));
    console.log('PYY balance on caller 2: ', formatEther(await PYY.balanceOf(caller2Addr)));


    /**+++++++++ END OF SIMULATION CURVE SWAPS ++++++++**/




}




async function diamond3() {
    // const diamond = require('diamond-util');

    const { getSelectors, FacetCutAction } = require('./libraries/diamond.js');

    const signers = await hre.ethers.getSigners();
    const signer1 = signers[0];
    const callerAddr = signer1.address;
    console.log('caller1: ', callerAddr);

    //Deploys DiamondCutFacet
    const DiamondCutFacet = await hre.ethers.getContractFactory('DiamondCutFacet');
    const diamondCutFacet = await DiamondCutFacet.deploy();
    await diamondCutFacet.deployed();
    console.log('DiamondCutFacet deployed to: ', diamondCutFacet.address);

    //Deploy Facets
    console.log('');
    console.log('Deploying Facets');
    const FacetNames = [
        'DiamondLoupeFacet',
        'DummyFacet'
    ];

    const cut = [];
    const FacetsContracts = [];
    for (let FacetName of FacetNames) {
        const Facet = await hre.ethers.getContractFactory(FacetName);
        const facet = await Facet.deploy();
        await facet.deployed();
        FacetsContracts.push(facet);
        console.log(`${FacetName} deployed to: ${facet.address}`);
        cut.push({
            facetAddress: facet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(facet)
        });
    }
    const facetAddresses = [FacetsContracts[0].address, FacetsContracts[1].address];

    //Deploys DiamondInit
    const DiamondInit = await hre.ethers.getContractFactory('DiamondInit');
    const diamondInit = await DiamondInit.deploy();
    await diamondInit.deployed();
    console.log('DiamondInit deployed to: ', diamondInit.address);

    const selecLoup = getSelectors(FacetsContracts[0]).filter((el, i) => i <= 4);
    const selecDummy = getSelectors(FacetsContracts[1]).filter((el, i) => i <= 1);
    const selectors = [...selecLoup, ...selecDummy];
    // console.log('selectors: ', selectors);

    // call to the init function
    let functionCall = diamondInit.interface.encodeFunctionData('init', [
        selectors, 
        facetAddresses
    ]);

    //Deploys Diamond
    const Diamond = await hre.ethers.getContractFactory('Diamond');
    const diamond = await Diamond.deploy(
        callerAddr, 
        diamondCutFacet.address,
        selecDummy,
        facetAddresses[1],
        diamondInit.address,
        functionCall
    );
    await diamond.deployed();
    console.log('Diamond deployed to: ', diamond.address);






    
  


    

    

    //Upgrade Diamond with Facets
    // console.log('');
    // console.log('Diamond cut: ', cut);
    // const diamondCut = await hre.ethers.getContractAt('IDiamondCut', diamond.address);
    // let tx;
    // let receipt;
    
    // tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall);
    // console.log('Diamond cut tx: ', tx.hash);
    // receipt = await tx.wait();
    // if (!receipt.status) {
    //     throw Error(`Diamond upgrade failed: ${tx.hash}`);
    // }
    console.log('Completed diamond cut');
    // return diamond.address;

    
    //Interacts with facets
    const [ diamondLoupeFacet, dummyFacet ] = FacetsContracts;
    // await diamond.getHello();
    await diamond.getOwner();

}





// diamond();

diamond2();

// diamond3();


// begin();
// .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
  
// simulate();

// buffering();
