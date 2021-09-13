const RenJS = require("@renproject/ren");
const { Bitcoin, Ethereum } = require("@renproject/chains");


async function execute() {

    const renJS = new RenJS('testnet', { useV2TransactionFormat: true });
    const btcMinterAddr = '0xA9816e2Ca3DC637ED385F50F5Ba732c4a7f6fa4A';
    // const signerAddr = '0x715358348287f44c8113439766b9433282110F6c';
    const amount = 0.003;
    // const provider = await 

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
        })
    });
    const depositAddress = mint.gatewayAddress;
    console.log(`Deposit ${amount} BTC in ${depositAddress}`);

    mint.on('Deposit', async (deposit) => {

        const hash = deposit.txHash();
        console.log('first hash: ', hash);
        console.log('details of deposit: ', deposit.depositDetails);

        const BTCdeposit = Bitcoin.utils.transactionExplorerLink(
            deposit.depositDetails.transaction,
            'testnet'
        );
        console.log('BTC deposit: ', BTCdeposit);

        await deposit.confirmed();
        await deposit.signed();
        await deposit
            .mint()
            .on('transactionHash', (txHash) => {
                console.log('Ethereum transaction: ', txHash.toString());
            });

        console.log(`Deposited ${amount} BTC`);

        //about to deposit BTC into the address and print to kovan
        //git repo got unlinked
        


    });

    
    






}


execute();




// execute()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });