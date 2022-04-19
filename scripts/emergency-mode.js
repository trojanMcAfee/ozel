const { providers, Wallet } = require('ethers')
const { L1TransactionReceipt, L1ToL2MessageStatus, getRawArbTransactionReceipt } = require('@arbitrum/sdk')
const { Bridge } = require('arb-ts');


const walletPrivateKey = process.env.PK;

const l1Provider = new providers.JsonRpcProvider(process.env.RINKEBY);
const l2Provider = new providers.JsonRpcProvider(process.env.ARB_TESTNET);
const l1Wallet = new Wallet(walletPrivateKey, l1Provider);
const l2Wallet = new Wallet(walletPrivateKey, l2Provider);


const paymeHopAddr = '0x0537FE8783444244792e25F73a64a34C8E68fA2c';
const fakeManager = '0x8EAB53F88B8B1Ee44D00c072eB8Ffa7eAAb81C35';

const filter = {
    address: paymeHopAddr,
    topics: [
        ethers.utils.id("ThrowTicket(uint256)")
    ]
};

async function getTxStatus(txnHash) {
    const receipt = await l1Provider.getTransactionReceipt(txnHash);
    const l1Receipt = new L1TransactionReceipt(receipt);

    const message = await l1Receipt.getL1ToL2Message(l2Wallet);
    console.log('message: ', message);
    const status = (await message.waitForStatus()).status;
    console.log('status: ', status);
}

async function main() {
    console.log('listening...');

    const l2Hashes = [];
    const bridge = await Bridge.init(l1Wallet, l2Wallet);

    const arbRetryableAddr = '0x000000000000000000000000000000000000006E';
    const arbRetryable = await (
        await hre.ethers.getContractAt('ArbRetryableTx', arbRetryableAddr)
    ).connect(l2Wallet);

    await hre.ethers.provider.on(filter, async (encodedData) => { 
        const { data } = encodedData;
        const ourMessagesSequenceNum = ethers.utils.defaultAbiCoder.decode(['uint'], data);

        console.log('inboxSeqNums: ', ourMessagesSequenceNum.toString());
        const retryableTxnHash = await bridge.calculateL2RetryableTransactionHash(
            ourMessagesSequenceNum[0]
        );
        console.log('retryableTxnHash: ', retryableTxnHash);
        console.log(
            `waiting for L2 tx 🕐... (should take < 10 minutes, current time: ${new Date().toTimeString()}`
        );

        l2Hashes.push(retryableTxnHash);
        console.log('l2Hashes: ', l2Hashes);


        setInterval(async function() {
            for (let i = 0; i < l2Hashes.length; i++) {
                // let hash = ethers.utils.hexlify(l2Hashes[i]);
                // console.log('hash in interval: ', hash);
                // console.log('type: ', typeof hash);
                let x = await arbRetryable.getTimeout(l2Hashes[i]);
                // if (x > 0) {
                //     await arbRetryable.redeem(hash);
                // }
                console.log('timeout: ', x.toString());
            }
        }, 60000);



        // getTxStatus(retryableTxnHash);

        // const retryRec = await l2Provider.waitForTransaction(retryableTxnHash)
        // console.log(`L2 retryable txn executed 🥳 ${retryRec.transactionHash} at ${new Date().toTimeString()}`);
    });

    

}


main();