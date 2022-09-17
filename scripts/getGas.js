const { providers, Wallet } = require('ethers')
const ethers = require('ethers')
const { hexDataLength } = require('@ethersproject/bytes')
const {
  L1ToL2MessageGasEstimator,
} = require('@arbitrum/sdk/dist/lib/message/L1ToL2MessageGasEstimator')
require('dotenv').config();


const l1Provider = new providers.JsonRpcProvider('https://rinkeby.infura.io/v3/ead605dd65704007ae941fffb7c1d1a7')
const l2Provider = new providers.JsonRpcProvider('https://arb-rinkeby.g.alchemy.com/v2/bnhYB2M32OLEj2rJs1oSE4--olVPMPU9')


const main = async () => {
    const signerAddr = '0x0E743a1E37D691D8e52F7036375F3D148B4116ba';
    const usdtAddrArb = '0x3B00Ef435fA4FcFF5C209a37d1f3dcff37c705aD';
    const defaultSlippage = 100;

    const userDetails = [
        signerAddr,
        usdtAddrArb,
        defaultSlippage
    ];

    // const newGreeting = 'Greeting from far, far away'
    const sendToArbBytes = ethers.utils.defaultAbiCoder.encode(
        ['tuple(address, address, uint256)'],
        [userDetails]
    );
    const sendToArbBytesLength = hexDataLength(sendToArbBytes) + 4

    const l1ToL2MessageGasEstimate = new L1ToL2MessageGasEstimator(l2Provider)

  const _submissionPriceWei =
    await l1ToL2MessageGasEstimate.estimateSubmissionFee(
      l1Provider,
      await l1Provider.getGasPrice(),
      sendToArbBytesLength
    )

  console.log(
    `Current retryable base submission price: ${_submissionPriceWei.toString()}`
  )


}

main();