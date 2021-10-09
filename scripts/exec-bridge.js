const RenJS = require("@renproject/ren");
const { Bitcoin, Ethereum } = require("@renproject/chains");
const BN = require('bn.js');
const { Wallet, providers: {JsonRpcProvider} } = require('ethers');
require('dotenv').config();
// const hre = require('hardhat');


async function executeBridge(user, userToken, provider, wallet) {
    const renJS = new RenJS('testnet', { useV2TransactionFormat: true });
    const payme = '0xF3520c9e345699abC36fFB347565C31A164825A8'; 
    const amount = 0.003; 
    // const provider = await hre.ethers.provider; 
    // const provider = new JsonRpcProvider(process.env.KOVAN);
    // const wallet = new Wallet(process.env.PK, provider);

    const mint = await renJS.lockAndMint({
        asset: 'BTC',
        from: Bitcoin(),
        to: Ethereum(provider).Contract({
            sendTo: payme,
            contractFn: 'deposit',
            contractParams: [
                {
                    name: '_user',
                    type: 'bytes',
                    value: Buffer.from(user.substring(2), 'hex')
                },
                {
                    name: '_userToken',
                    type: 'bytes',
                    value: Buffer.from(userToken.substring(2), 'hex')
                }
            ]
        }),
        nonce: new BN(46).toArrayLike(Buffer, "be", 32) //increment nonce programatically
    });
    
    return mint;
}


module.exports = {
    executeBridge
};

