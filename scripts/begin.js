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
    const ethAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    const uniRouterV2Addr = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    const uniRouterV2 = await hre.ethers.getContractAt('IUniswapV2Router02', uniRouterV2Addr);
    const [callerAddr, caller2Addr] = await hre.ethers.provider.listAccounts();
    let wethAddr;
    let wbtcAddr;
    let renBtcAddr;
    let registryAddr;
    let renPoolAddr;
    let tricryptoAddr;
    let usdtAddr;
    
    let network = 'mainnet';
    if (network === 'mainnet') {
        registryAddr = '0x557e211EC5fc9a6737d2C6b7a1aDe3e0C11A8D5D';
        renPoolAddr = '0x93054188d876f558f4a66B2EF1d97d16eDf0895B';
        tricryptoAddr = '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46';
        renBtcAddr = '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d';
        wbtcAddr = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
        wethAddr = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
        usdtAddr = '0xdac17f958d2ee523a2206206994597c13d831ec7';
    } else if (network === 'arbitrum') {
        registryAddr = '0x21C482f153D0317fe85C60bE1F7fa079019fcEbD';
        renPoolAddr = '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb';
        tricryptoAddr = '0x960ea3e3C7FB317332d990873d354E18d7645590';
        renBtcAddr = '0xdbf31df14b66535af65aac99c32e9ea844e14501';
        wbtcAddr = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f';
        wethAddr = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';
        usdtAddr = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9';
    }

    const WETH = await hre.ethers.getContractAt('IERC20', wethAddr);
    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddr);
    const WBTC = await hre.ethers.getContractAt('IERC20', wbtcAddr);
    const renBTC = await hre.ethers.getContractAt('IERC20', renBtcAddr);
    const path = [wethAddr, renBtcAddr];

    //Deploys Vault
    const Vault = await hre.ethers.getContractFactory('Vault');
    const vault = await Vault.deploy();
    await vault.deployed();
    console.log('Vault deploy to: ', vault.address);
   
    //Deploys Manager
    const Manager = await hre.ethers.getContractFactory('Manager');
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
    

    //Deploys PayMe
    const PayMe = await hre.ethers.getContractFactory("PayMe");
    const payme = await PayMe.deploy(registryAddr, manager.address, renBtcAddr);
    await payme.deployed();
    console.log("PayMe deployed to:", payme.address);
    console.log('---------------------------------------');



    /******** SIMULARES UNI SWAPS **********/
    //First user
    async function simulateUniswap() {
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
        let renBalance = await vault.getTokenBalance(renBtcAddr);
        let wbtcBalance = await vault.getTokenBalance(wbtcAddr);
        const usdtBalance = await USDT.balanceOf(callerAddr);
        console.log('renBTC balance on Vault after 1st swap: ', renBalance.toString() / 10 ** 8);
        console.log('WBTC balance on Vault after 1st swap: ', wbtcBalance.toString() / 10 ** 8);
        console.log('USDT balance of caller 1: ', usdtBalance.toString() / 10 ** 6);
        console.log('---------------------------------------');

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
        renBalance = await vault.getTokenBalance(renBtcAddr);
        wbtcBalance = await vault.getTokenBalance(wbtcAddr);
        const wethBalance = await WETH.balanceOf(caller2Addr);
        console.log('renBTC balance on FeesVault after 2nd swap: ', renBalance.toString() / 10 ** 8);
        console.log('WBTC balance on Vault after 1st swap: ', wbtcBalance.toString() / 10 ** 8);
        console.log('WETH balance of caller 2: ', formatEther(wethBalance));
    }
    simulateUniswap();
    /********* END OF SIMULATES UNI SWAPS *********/

    /**+++++++++ SIMULATES CURVE SWAPS ++++++++**/
    const IWETH = await hre.ethers.getContractAt('IWETH', wethAddr);
    await IWETH.deposit({value: parseEther('100')});

    //First user
    const wethBalance_2 = formatEther(await WETH.balanceOf(callerAddr));
    console.log('WETH balance caller ******: ', wethBalance_2);

    let amountIn = parseEther('95'); 
    const tricryptoPool = await hre.ethers.getContractAt('ITricrypto', tricryptoAddr);
    await tricryptoPool.exchange(2, 1, amountIn, 1, true, {
        value: amountIn
    });

    amountIn = await WBTC.balanceOf(callerAddr);
    console.log('amount in ++++++++: ', amountIn);
    const renPool = await hre.ethers.getContractAt('IRenPool', renPoolAddr);
    await renPool.exchange(1, 0, (7 * 10 ** 8), 0); //reverting - check txs on etherscan contract

    console.log('renBTC balance caller ******: ', (await renBTC.balanceOf(callerAddr)).toString() / 10 ** 8);


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
