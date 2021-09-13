const { pBTC } = require('ptokens-pbtc');
const pkg = require('ptokens-utils');
require('dotenv').config();
// import { pBTC } from 'ptokens-pbtc'
// import pkg from 'ptokens-utils'
const { HttpProvider } = require('ptokens-providers');
const { Node } = require('ptokens-node');
    
async function main() {

  const { constants } = pkg;
  const provider = await hre.ethers.provider;
  const [signerAddr] = await provider.listAccounts();
  console.log('signer address: ', signerAddr);
 

  // const pbtc = new pBTC({
  //   blockchain: constants.blockchains.Polygon, //EthereumRopsten
  //   network: constants.networks.PolygonMainnet,
  //   // ethPrivateKey: process.env.PK, //EthereumMainnet
  //   ethProvider: provider,
  // });

  const pbtc = new pBTC({
      hostBlockchain: 'ETH',
      hostNetwork: 'testnet_ropsten',
      nativeBlockchain: 'BTC',
      nativeNetwork: 'testnet',
      defaultNode: 'https://pbtconeth-testnet-1a.ngrok.io'
  });
  
  console.log('hi');
  const depositAddress = await pbtc.getDepositAddress(signerAddr);
  console.log('BTC deposit address: ', depositAddress.value);

  // console.log('constants: ', constants);


  // depositAddress.waitForDeposit()
  //   .once('nativeTxBroadcasted', tx => console.log('nativeTxBroadcasted: ', tx))
  //   .once('nativeTxConfirmed', tx => console.log('nativeTxConfirmed: ', tx))
  //   .once('nodeReceivedTx', tx => console.log('nodeReceivedTx: ', tx))
  //   .once('nodeBroadcastedTx', tx => console.log('nodeBroadcastedTx: ', tx))
  //   .once('hostTxConfirmed', tx => console.log('hostTxConfirmed: ', tx))
  //   .then(res => console.log('res: ', res));

  // const tx = await depositAddress.waitForDeposit();



  }


  // depositAddress.waitForDeposit()
  //   .once('nativeTxBroadcasted', tx => console.log('nativeTxBroadcasted: ', tx))
  //   .once('nativeTxConfirmed', tx => console.log('nativeTxConfirmed: ', tx))
  //   .once('nodeReceivedTx', tx => console.log('nodeReceivedTx: ', tx))
  //   .once('nodeBroadcastedTx', tx => console.log('nodeBroadcastedTx: ', tx))
  //   .once('hostTxConfirmed', tx => console.log('hostTxConfirmed: ', tx))
  //   .then(res => console.log('res: ', res));


  
  



  // main();

  main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
  
