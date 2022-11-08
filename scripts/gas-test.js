

const { getGasDetailsL2 } = require('./helpers-eth');

const { 
    usdtAddrArb,
    defaultSlippage
 } = require('./state-vars');



async function main() {
    const [signerAddr, signerAddr2] = await hre.ethers.provider.listAccounts(); 
    console.log('signer address: ', signerAddr);

    const userDetails = [
        signerAddr,
        usdtAddrArb,
        defaultSlippage 
    ];

    let { submissionPriceWei, gasPriceBid } = await getGasDetailsL2(userDetails);


}