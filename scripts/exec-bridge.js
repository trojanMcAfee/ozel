const RenJS = require("@renproject/ren");
const { Bitcoin, Ethereum } = require("@renproject/chains");
const BN = require('bn.js');
// const hre = require('hardhat');


async function execute() {
    const renJS = new RenJS('testnet', { useV2TransactionFormat: true });
    const btcMinterAddr = '0xA9816e2Ca3DC637ED385F50F5Ba732c4a7f6fa4A';
    const amount = 0.003;
    const provider = await hre.ethers.provider;

    const mint = await renJS.lockAndMint({
        asset: 'BTC',
        from: Bitcoin(),
        to: Ethereum(provider).Contract({
            sendTo: btcMinterAddr,
            contractFn: 'deposit',
            contractParams: [
                {
                    name: 'msg',
                    type: 'bytes',
                    value: Buffer.from(`Depositing ${amount} BTC ****`)
                }
            ]
        }),
        nonce: new BN(45).toArrayLike(Buffer, "be", 32) //increment nonce programatically
    });
    
    return mint;
}


module.exports = {
    execute
};


