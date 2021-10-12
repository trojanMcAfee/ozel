const RenJS = require("@renproject/ren");
const { Bitcoin, Ethereum } = require("@renproject/chains");
const BN = require('bn.js');
// const hre = require('hardhat');


async function executeBridge(user, userToken) {
    const renJS = new RenJS('testnet', { useV2TransactionFormat: true });
    const payme = '0x26fA53176d5703aECBB8e29321a53E76c6C7EC78'; //verified: 0xF3520c9e345699abC36fFB347565C31A164825A8
    const amount = 0.003; //with deposit event (address): 0x59013beF700EEe0BD4473cEbeB1f8Be340a49eFF
    const provider = await hre.ethers.provider; //with no Deposit event: 0x26fA53176d5703aECBB8e29321a53E76c6C7EC78

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
        nonce: new BN(94).toArrayLike(Buffer, "be", 32) ////increment nonce programatically
        // txConfig: {gas:3000000}
    });
    
    return mint;
}


module.exports = {
    executeBridge
};

