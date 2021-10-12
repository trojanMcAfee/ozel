const RenJS = require("@renproject/ren");
const { Bitcoin, Ethereum } = require("@renproject/chains");
const BN = require('bn.js');
// const hre = require('hardhat');


async function executeBridge(user, userToken) {
    const renJS = new RenJS('testnet', { useV2TransactionFormat: true });
    const payme = '0x90E8aB6043DD050FB9102BF9cD26858734d32F3B'; //verified: 0xF3520c9e345699abC36fFB347565C31A164825A8
    const amount = 0.003; //with correct testBTC and only transfer(): 0x9370bCEEF74f4373D336727f881330DF1A648C77
    const provider = await hre.ethers.provider; 

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
        nonce: new BN(96).toArrayLike(Buffer, "be", 32) ////increment nonce programatically
        // txConfig: {gas:3000000}
    });
    
    return mint;
}


module.exports = {
    executeBridge
};

