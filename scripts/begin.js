const { Bitcoin } = require("@renproject/chains");
const { executeBridge } = require('./exec-bridge.js');
const { sendBitcoin } = require('./init-btc-tx.js');
const { MaxUint256 } = ethers.constants;
const { parseEther, formatEther } = ethers.utils;

const amountToSend = 0.0001;

//Variables that are supposed to be dynamically created
const sendingAddr = 'mubUbyPazdyvhPJYPGWUkFWj7bkw1Yq8ys';
const senderPK = process.env.PK_TEST;

async function begin() {
    const usdtAddr = '0xdac17f958d2ee523a2206206994597c13d831ec7';
    const wethAddr = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const [userAddr] = await hre.ethers.provider.listAccounts();
    const userToken = usdtAddr;
    // const USDT = await hre.ethers.getContractAt('IERC20', usdtAddr);
    
    //Creates the "mint" object for bridge execution
    const mint = await executeBridge(userAddr, userToken); 

    //Gets the BTC gateway deposit address
    const depositAddress = mint.gatewayAddress;
    console.log('BTC deposit address: ', depositAddress);

    //Sends the deposited BTC to the bridge deposit address
    await sendBitcoin(depositAddress, amountToSend, sendingAddr, senderPK);
    console.log('hellooooo');
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
            .on('transactionHash', (txHash) => {
                console.log('Ethereum transaction: ', txHash.toString());
            });

        console.log(`Deposited ${amountToSend} BTC`);
    });

    // const usdtBalance = await USDT.balanceOf(usdtAddr);
    // console.log('USDT balance: ', usdtBalance.toString());

}


//Sends renBTC to PayMe2 as a simulation
async function simulate() {
    const uniRouterV2Addr = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    const wethAddr = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
    const renBtcAddr = '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d';
    const registryAddr = '0x557e211EC5fc9a6737d2C6b7a1aDe3e0C11A8D5D'; //arb: 0x21C482f153D0317fe85C60bE1F7fa079019fcEbD
    const usdtAddr = '0xdac17f958d2ee523a2206206994597c13d831ec7';
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
    const renBtcAddr = '0xeb4c2781e4eba804ce9a9803c67d0893436bb27d';
    const registryAddr = '0x557e211EC5fc9a6737d2C6b7a1aDe3e0C11A8D5D'; //arb: 0x21C482f153D0317fe85C60bE1F7fa079019fcEbD
    const usdtAddr = '0xdac17f958d2ee523a2206206994597c13d831ec7';
    const ethAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    const [callerAddr, caller2Addr] = await hre.ethers.provider.listAccounts();
   
    const Vault = await hre.ethers.getContractFactory('Vault');
    const vault = await Vault.deploy();
    await vault.deployed();
    console.log('Vault deployed to: ', vault.address);
    
    const renBTC = await hre.ethers.getContractAt('IERC20', renBtcAddr);
    const uniRouterV2 = await hre.ethers.getContractAt('IUniswapV2Router02', uniRouterV2Addr);
    const path = [wethAddr, renBtcAddr];

    const PayMe = await hre.ethers.getContractFactory("PayMe3");
    const payme = await PayMe.deploy(registryAddr, vault.address);
    await payme.deployed();
    console.log("PayMe3 deployed to:", payme.address);
    
    //First user
    let tradedAmount = 1 * 10 ** 8;
    await uniRouterV2.swapETHForExactTokens(tradedAmount, path, payme.address, MaxUint256, {
        value: parseEther('100')
    });
    let userToken = usdtAddr;
    
    await payme.setAllowance();
    //this function is called on deposit() from PayMe2 when receiving the renBTC
    await vault.exchangeToUserToken(tradedAmount, callerAddr, userToken, payme.address);
    
    //Second user
    tradedAmount = 0.5 * 10 ** 8;
    await uniRouterV2.swapETHForExactTokens(tradedAmount, path, payme.address, MaxUint256, {
        value: parseEther('100')
    });
    userToken = wethAddr;
    await vault.exchangeToUserToken(tradedAmount, caller2Addr, userToken, payme.address);
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



// begin();
// .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
  
// simulate();

simulate2();

// buffering();
