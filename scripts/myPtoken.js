const { pBTC } = require('ptokens-pbtc');
const { formatEther, parseEther } = ethers.utils;
const pkg = require('ptokens-utils');
// const { Wallet, providers: {JsonRpcProvider} } = require('ethers');
require('dotenv').config();


async function main() {

  const PayMe = await hre.ethers.getContractFactory('PayMe');
  const payme = await PayMe.deploy();
  await payme.deployed();
  console.log('PayMe deployed to: ', payme.address);

  const { constants } = pkg;
  // const provider = new JsonRpcProvider(process.env.ROPSTEN_URL);
  // const wallet = new Wallet(process.env.PK, provider);
  // const signerAddr = await wallet.address;
  // const [signerAddr] = await provider.listAccounts();
  // console.log('signer address: ', signerAddr); 


  const pbtc = new pBTC({
    blockchain: constants.blockchains.Ethereum, //EthereumRopsten
    network: constants.networks.EthereumMainnet,
    ethProvider: process.env.ALCHEMY,
  });

  // const pbtc = new pBTC({
  //     hostBlockchain: 'ETH',
  //     hostNetwork: 'testnet_ropsten',
  //     nativeBlockchain: 'BTC',
  //     nativeNetwork: 'testnet',
  //     defaultNode: 'https://pbtconeth-testnet-1a.ngrok.io',
  //     ethProvider: process.env.ROPSTEN_URL
  // });
  
  const depositAddress = await pbtc.getDepositAddress(payme.address); //signerAddr
  console.log('BTC deposit address: ', depositAddress.value);




  }




  async function main2() {
    const account1 = '0x715358348287f44c8113439766b9433282110F6c';
    const account2 = '0xE8d9B359F9da35e8a19E612807376152ff445DF2';

    const provider = new JsonRpcProvider(process.env.ROPSTEN_URL);
    const walletAcc1 = new Wallet(process.env.PK, provider);
    const walletAcc2 = new Wallet(process.env.PK_ROP_2, provider);

    const pBtcContract = '0xff9a0ca711bf8d1584ce08632fd60dddc0034098';
    const pBTC = await hre.ethers.getContractAt('IERC20', pBtcContract);
    const pBTC777 = await hre.ethers.getContractAt('IERC777', pBtcContract);

    const pBtcBalance = await pBTC.balanceOf(account1);
    console.log('pBTC balance of signer: ', formatEther(pBtcBalance));

    const pBtcBalance777 = await pBTC777.balanceOf(account1);
    console.log('pBTC balance777 of signer: ', formatEther(pBtcBalance777));

    await pBTC777.connect(walletAcc1).authorizeOperator(account2);
    const isOp = await pBTC777.connect(walletAcc1).isOperatorFor(account2, account1);
    console.log('is operator?: ', isOp);

    // await pBTC777.connect(walletAcc2).operatorSend(
    //   account1,
    //   account2,
    //   parseEther('0.002'),
    //   0,
    //   0
    // );

    const pBtcBalance2 = await pBTC777.balanceOf(account2);
    console.log('pBTC balance of acc2: ', formatEther(pBtcBalance2));

  }





  
  



  // main();

  main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
  
// main2()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });




// depositAddress.waitForDeposit()
  //   .once('nativeTxBroadcasted', tx => console.log('nativeTxBroadcasted: ', tx))
  //   .once('nativeTxConfirmed', tx => console.log('nativeTxConfirmed: ', tx))
  //   .once('nodeReceivedTx', tx => console.log('nodeReceivedTx: ', tx))
  //   .once('nodeBroadcastedTx', tx => console.log('nodeBroadcastedTx: ', tx))
  //   .once('hostTxConfirmed', tx => console.log('hostTxConfirmed: ', tx))
  //   .then(res => console.log('res: ', res));
  