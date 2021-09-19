const RenJS = require("@renproject/ren");
const { Bitcoin, Ethereum } = require("@renproject/chains");
const BN = require('bn.js');


async function execute() {

    const renJS = new RenJS('testnet', { useV2TransactionFormat: true });
    const btcMinterAddr = '0xA9816e2Ca3DC637ED385F50F5Ba732c4a7f6fa4A';
    // const signerAddr = '0x715358348287f44c8113439766b9433282110F6c';
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
        nonce: new BN(42).toArrayLike(Buffer, "be", 32)
    });
    const depositAddress = mint.gatewayAddress;
    console.log(`Deposit ${amount} BTC in ${depositAddress}`);

    mint.on('deposit', async (deposit) => {
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
            .on('transactionHash', (txHash) => {
                console.log('Ethereum transaction: ', txHash.toString());
            });

        console.log(`Deposited ${amount} BTC`);

        

    });
}


execute();




// execute()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });