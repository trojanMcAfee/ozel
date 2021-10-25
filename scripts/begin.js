const { Bitcoin } = require("@renproject/chains");
const { executeBridge } = require('./exec-bridge.js');
const { sendBitcoin } = require('./init-btc-tx.js');
const { MaxUint256 } = ethers.constants;
const { parseEther, formatEther } = ethers.utils;


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
    const ethAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    const uniRouterV2Addr = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
    const uniRouterV2 = await hre.ethers.getContractAt('IUniswapV2Router02', uniRouterV2Addr);
    const [callerAddr, caller2Addr] = await hre.ethers.provider.listAccounts();
    console.log('Caller 1: ', callerAddr);
    console.log('Caller 2: ', caller2Addr);
    let wethAddr;
    let wbtcAddr;
    let renBtcAddr;
    let registryAddr;
    let renPoolAddr;
    let tricryptoAddr;
    let usdtAddr;
    // let crvRenWBTC;
    let crvTricrypto;
    
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

    const WETH = await hre.ethers.getContractAt('IERC20', wethAddr);
    const USDT = await hre.ethers.getContractAt('IERC20', usdtAddr);
    const WBTC = await hre.ethers.getContractAt('IERC20', wbtcAddr);
    const renBTC = await hre.ethers.getContractAt('IERC20', renBtcAddr);
    const path = [wethAddr, renBtcAddr];

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
        const tx = await payme.transferToManager(
            manager.address,
            caller,
            userToken
        );
        console.log('index: ', (await manager.distributionIndex()).toString() / 10 ** 18);
        // const totalVolume = (await manager.totalVolume()).toString();
        // console.log('total volume: ', (10 ** 8 / totalVolume));



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








// begin();
// .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });
  
simulate();

// buffering();
