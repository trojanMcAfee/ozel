const { pBTC } = require('ptokens-pbtc');
const { formatEther, parseEther, parseUnits } = ethers.utils;
const { MaxUint256 } = ethers.constants;
const pkg = require('ptokens-utils');
const { Wallet, providers: {JsonRpcProvider} } = require('ethers');
require('dotenv').config();

const provider = new JsonRpcProvider(process.env.ROPSTEN_URL);
const wallet = new Wallet(process.env.PK, provider);
const pBtcContract = '0xff9a0ca711bf8d1584ce08632fd60dddc0034098'; //ropsten
// const pBTC = '0x5228a22e72ccc52d415ecfd199f99d0665e7733b'; // mainnet
let signerAddr;


/**
 * From BTC -> pBTC -> pBTC in contract (Ropsten)
 */
async function main() {
  // const { constants } = pkg;
  const payMeAddr = '0x5dEAA27Ae433a3886E1AFA6f6b9Cc9565E9b30CD';
  const payme = await hre.ethers.getContractAt('PayMe', payMeAddr);
  signerAddr = await wallet.address;
  console.log('signer address: ', signerAddr); 

  // // Creates the BTC deposit address for pTokens //-----> for mainnet
  // const pbtc = new pBTC({
  //   blockchain: constants.blockchains.Ethereum, 
  //   network: constants.networks.EthereumMainnet,
  //   ethProvider: process.env.ALCHEMY,
  // });

  const pbtc = new pBTC({
      hostBlockchain: 'ETH',
      hostNetwork: 'testnet_ropsten',
      nativeBlockchain: 'BTC',
      nativeNetwork: 'testnet',
      defaultNode: 'https://pbtconeth-testnet-1a.ngrok.io',
      ethProvider: process.env.ROPSTEN_URL
  });
  
  const depositAddress = await pbtc.getDepositAddress(payMeAddr); 
  console.log('BTC deposit address: ', depositAddress.value);


  depositAddress.waitForDeposit()
    .once('nativeTxBroadcasted', tx => console.log('nativeTxBroadcasted: ', tx))
    .once('nativeTxConfirmed', tx => console.log('nativeTxConfirmed: ', tx))
    .once('nodeReceivedTx', tx => console.log('nodeReceivedTx: ', tx))
    .once('nodeBroadcastedTx', tx => console.log('nodeBroadcastedTx: ', tx))
    .once('hostTxConfirmed', tx => console.log('hostTxConfirmed: ', tx))
    .then(async (res) => {
      console.log('res: ', res);
      const x = await payme.getBalance();
      console.log('pBTC balance of payme: ', formatEther(x)); 
    });

  }


/**
 * Simulates BTC -> pBTC with a swap from Uniswap on mainnet fork
 */
async function main2() {
  const uniRouterV2Addr = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
  const pBTCAddr = '0x5228a22e72ccc52d415ecfd199f99d0665e7733b';
  const wethAddr = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
  const usdcAddr = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

  const PayMe = await hre.ethers.getContractFactory("PayMe");
  const payme = await PayMe.deploy(pBTCAddr);
  await payme.deployed();
  console.log("PayMe deployed to:", payme.address);

  const uniRouterV2 = await hre.ethers.getContractAt('IUniswapV2Router02', uniRouterV2Addr);
  const pBTC = await hre.ethers.getContractAt('IERC20', pBTCAddr);
  const USDC = await hre.ethers.getContractAt('IERC20', usdcAddr);
  // await pBTC.approve(uniRouterV2Addr, MaxUint256);
  const path = [wethAddr, pBTCAddr];
  const amount = parseEther('0.05');
  await uniRouterV2.swapETHForExactTokens(
    amount, //0.05
    path,
    payme.address,
    MaxUint256,
    {value: parseEther('1')}
  );

  const x = await pBTC.balanceOf(payme.address);
  console.log('pBTC balance: ', formatEther(x));

  



}




  async function approveOp() {
    // const account1 = '0x715358348287f44c8113439766b9433282110F6c';
    // const account2 = '0xE8d9B359F9da35e8a19E612807376152ff445DF2';

    // const provider = new JsonRpcProvider(process.env.ROPSTEN_URL);
    // const walletAcc1 = new Wallet(process.env.PK, provider);
    // const walletAcc2 = new Wallet(process.env.PK_ROP_2, provider);

    // const pBTC = await hre.ethers.getContractAt('IERC20', pBtcContract);
    // const pBtcContract = '0xff9a0ca711bf8d1584ce08632fd60dddc0034098';
    // const pBTC777 = await hre.ethers.getContractAt('IERC777', pBtcContract);

    // const pBtcBalance = await pBTC.balanceOf(account1);
    // console.log('pBTC balance of signer: ', formatEther(pBtcBalance));

    // const pBtcBalance777 = await pBTC777.balanceOf(account1);
    // console.log('pBTC balance777 of signer: ', formatEther(pBtcBalance777));
    const pBTC777 = await hre.ethers.getContractAt('IERC777', pBtcContract);
    await pBTC777.connect(wallet).authorizeOperator(payMeAddr);
    const isOp = await pBTC777.connect(wallet).isOperatorFor(payMeAddr, signerAddr);
    console.log('is operator?: ', isOp);

    // await pBTC777.connect(walletAcc2).operatorSend(
    //   account1,
    //   account2,
    //   parseEther('0.002'),
    //   0,
    //   0
    // );

    // const pBtcBalance2 = await pBTC777.balanceOf(account2);
    // console.log('pBTC balance of acc2: ', formatEther(pBtcBalance2));

  }





  
  



  main2();

  // main()
  // .then(() => process.exit(0))
  // .catch((error) => {
  //   console.error(error);
  //   process.exit(1);
  // });
  





// depositAddress.waitForDeposit()
//     .once('nativeTxBroadcasted', tx => console.log('nativeTxBroadcasted: ', tx))
//     .once('nativeTxConfirmed', tx => console.log('nativeTxConfirmed: ', tx))
//     .once('nodeReceivedTx', tx => console.log('nodeReceivedTx: ', tx))
//     .once('nodeBroadcastedTx', tx => console.log('nodeBroadcastedTx: ', tx))
//     .once('hostTxConfirmed', tx => console.log('hostTxConfirmed: ', tx))
//     .then(res => console.log('res: ', res));
  