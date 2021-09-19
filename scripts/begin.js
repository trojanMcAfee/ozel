const { Bitcoin } = require("@renproject/chains");
const { execute } = require('./exec-bridge.js');
const { sendBitcoin } = require('./init-btc-tx.js');

const amountToSend = 0.0001;

//Variables that are supposed to be dynamically created
const sendingAddr = 'mubUbyPazdyvhPJYPGWUkFWj7bkw1Yq8ys';
const senderPK = process.env.PK_TEST;

async function begin() {
    //Creates the "mint" object for bridge execution
    const mint = await execute();

    //Gets the BTC gateway deposit address
    const depositAddress = mint.gatewayAddress;
    console.log('BTC deposit address: ', depositAddress);

    //Sends the deposited BTC to the bridge deposit address
    await sendBitcoin(depositAddress, amountToSend, sendingAddr, senderPK);

    //Mints renBTC
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

        console.log(`Deposited ${amountToSend} BTC`);
    });
}
    

begin();