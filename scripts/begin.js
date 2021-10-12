const { Bitcoin } = require("@renproject/chains");
const { executeBridge } = require('./exec-bridge.js');
const { sendBitcoin } = require('./init-btc-tx.js');
const { MaxUint256 } = ethers.constants;
const { parseEther, formatEther } = ethers.utils;

const amountToSend = 0.002;

//Variables that are supposed to be dynamically created
const sendingAddr = 'mubUbyPazdyvhPJYPGWUkFWj7bkw1Yq8ys';
const senderPK = process.env.PK_TEST;

//Simulation variables (KOVAN)
// const wethAddr = '0xd0A1E359811322d97991E03f863a0C30C2cF029C'; //mainnet: 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
// const usdtAddr = '0xf3e0d7bf58c5d455d31ef1c2d5375904df525105'; //mainnet: 0xdac17f958d2ee523a2206206994597c13d831ec7
// const uniRouterV2Addr = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';



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


//Sends renBTC to PayMe2 as a simulation
async function simulate() {
    // const uniRouterV2Addr = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    // const wethAddr = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const renBtcAddr = '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d';
    const registryAddr = '0x557e211EC5fc9a6737d2C6b7a1aDe3e0C11A8D5D'; //arb: 0x21C482f153D0317fe85C60bE1F7fa079019fcEbD
    // const usdtAddr = '0xdac17f958d2ee523a2206206994597c13d831ec7';
    const ethAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    const [callerAddr, caller2Addr] = await hre.ethers.provider.listAccounts();
   
    const Vault = await hre.ethers.getContractFactory('Vault');
    const vault = await Vault.deploy();
    const vaultContract = await vault.deployed();
    
    const renBTC = await hre.ethers.getContractAt('IERC20', renBtcAddr);
    const uniRouterV2 = await hre.ethers.getContractAt('IUniswapV2Router02', uniRouterV2Addr);
    const path = [wethAddr, renBtcAddr];

    const PayMe = await hre.ethers.getContractFactory("PayMe2");
    const payme = await PayMe.deploy(registryAddr, vaultContract.address);
    await payme.deployed();
    console.log("PayMe2 deployed to:", payme.address);
    
    //First user
    let tradedAmount = 1 * 10 ** 8;
    await uniRouterV2.swapETHForExactTokens(tradedAmount, path, payme.address, MaxUint256, {
        value: parseEther('100')
    });
    let userToken = usdtAddr;
    //this function is called on deposit() from PayMe2 when receiving the renBTC
    await payme.exchangeToUserToken(tradedAmount, callerAddr, userToken);

    //Second user
    tradedAmount = 0.5 * 10 ** 8;
    await uniRouterV2.swapETHForExactTokens(tradedAmount, path, payme.address, MaxUint256, {
        value: parseEther('100')
    });
    userToken = wethAddr;
    await payme.exchangeToUserToken(tradedAmount, caller2Addr, userToken);
}


async function simulate2() {
    const uniRouterV2Addr = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    const wethAddr = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const WETH = await hre.ethers.getContractAt('IERC20', wethAddr);
    const renBtcAddr = '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d';
    const registryAddr = '0x557e211EC5fc9a6737d2C6b7a1aDe3e0C11A8D5D'; //arb: 0x21C482f153D0317fe85C60bE1F7fa079019fcEbD
    const usdtAddr = '0xdac17f958d2ee523a2206206994597c13d831ec7';
    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddr);
    const ethAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    const [callerAddr, caller2Addr] = await hre.ethers.provider.listAccounts();
    const uniRouterV2 = await hre.ethers.getContractAt('IUniswapV2Router02', uniRouterV2Addr);
    const path = [wethAddr, renBtcAddr];

    //Deploys Vault
    const Vault = await hre.ethers.getContractFactory('Vault');
    const vault = await Vault.deploy();
    await vault.deployed();
    console.log('Vault deploy to: ', vault.address);
   
    //Deploys Manager
    const Manager = await hre.ethers.getContractFactory('Manager');
    const manager = await Manager.deploy(vault.address);
    await manager.deployed();
    console.log('Manager deployed to: ', manager.address);
    
    // const renBTC = await hre.ethers.getContractAt('IERC20', renBtcAddr);

    //Deploys PayMe
    const PayMe = await hre.ethers.getContractFactory("PayMe");
    const payme = await PayMe.deploy(registryAddr, manager.address, renBtcAddr);
    await payme.deployed();
    console.log("PayMe deployed to:", payme.address);
    
    //First user
    let tradedAmount = 1 * 10 ** 8;
    await uniRouterV2.swapETHForExactTokens(tradedAmount, path, payme.address, MaxUint256, {
        value: parseEther('100')
    });
    let userToken = usdtAddr;

    await payme.transferToManager(
        manager.address,
        callerAddr,
        userToken
    );
    let renBalance = await vault.getRenBalance();
    const usdtBalance = await USDT.balanceOf(callerAddr);
    console.log('renBTC balance on FeesVault after 1st swap: ', renBalance.toString() / 10 ** 8);
    console.log('USDT balance of caller 1: ', usdtBalance.toString() / 10 ** 6);
        
    // //Second user
    tradedAmount = 0.5 * 10 ** 8;
    await uniRouterV2.swapETHForExactTokens(tradedAmount, path, payme.address, MaxUint256, {
        value: parseEther('100')
    });
    userToken = wethAddr;

    await payme.transferToManager(
        manager.address,
        caller2Addr,
        userToken
    );
    renBalance = await vault.getRenBalance();
    const wethBalance = await WETH.balanceOf(caller2Addr);
    console.log('renBTC balance on FeesVault after 2nd swap: ', renBalance.toString() / 10 ** 8);
    console.log('WETH balance of caller 2: ', formatEther(wethBalance));
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

async function swapForUSDT() { //KOVAN
    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddr); 
    const uniRouterV2 = await hre.ethers.getContractAt('IUniswapV2Router02', uniRouterV2Addr);
    const [callerAddr] = await hre.ethers.provider.listAccounts();
    console.log('caller Address: ', callerAddr);
    
    const provider = await hre.ethers.provider;
    const wallet_2 = new ethers.Wallet(process.env.PK_ROP_2, provider);
    console.log('address 2: ', wallet_2.address);
    const callerAddr2 = wallet_2.address
;
    const path = [wethAddr, usdtAddr];
    let tradedAmount = 1000 * 10 ** 6;
    console.log('hi');
    // await uniRouterV2.swapETHForExactTokens(tradedAmount, path, wallet_2.address, MaxUint256, {
    //     value: parseEther('100')
    //     // gasLimit: 2000000
    // });

    // const factory = await uniRouterV2.factory();
    // console.log('factory: ', factory);
    const amount = await uniRouterV2.swapExactETHForTokens(1, path, callerAddr2, MaxUint256, {
        value: parseEther('0.01'),
        gasLimit: 3000000
    });
    console.log('amount: ', amount); //trying to get some USDT on the kovan account

 

    console.log('hi2');
    const usdtBalance = await USDT.balanceOf(callerAddr2);
    console.log('USDT balance: ', usdtBalance.toString() / 10 ** 6);

}

async function getVars() {
    const managerAddr = '0xB3aCF146515df785C162BC726f23dD218270b5D7';
    const manager = await hre.ethers.getContractAt('Manager', managerAddr);

    const user = await manager.user();
    const userToken = await manager.userToken();
    
    console.log('user: ', user);
    console.log('user token: ', userToken);
}


// getVars();

// swapForUSDT();

// begin();
// .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
  
// simulate();

simulate2();

// buffering();
