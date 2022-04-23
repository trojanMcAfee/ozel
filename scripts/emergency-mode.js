const { providers, Wallet } = require('ethers')
const { Bridge } = require('arb-ts');
const { ethers } = require('hardhat');


const walletPrivateKey = process.env.PK;

const l1Provider = new providers.JsonRpcProvider(process.env.RINKEBY);
const l2Provider = new providers.JsonRpcProvider(process.env.ARB_TESTNET);
const l1Wallet = new Wallet(walletPrivateKey, l1Provider);
const l2Wallet = new Wallet(walletPrivateKey, l2Provider);


// const paymeHopAddr = '0xBb8FDbD6D27b39B62A55e38974B3CFA7430A1fb9'; //old: 0xB417bba56fa2bcE92AfAd7562d16973aE1aF98F3
const emitterAddr = '0xeD64c50c0412DC24B52aC432A3b723e16E18776B';

const filter = {
    address: emitterAddr,
    topics: [
        ethers.utils.id("showTicket(uint256)")
    ]
};



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
            console.log(`start interval: ${new Date().toTimeString()}`);
            console.log('hashes in interval: ', l2Hashes);

            for (let i = 0; i < l2Hashes.length; i++) {
                let x = await arbRetryable.getTimeout(l2Hashes[i]);
                console.log('timeout: ', x.toString());
                if (x > 0) {
                    const tx = await arbRetryable.connect(l2Wallet).redeem(l2Hashes[i], {
                        gasLimit: ethers.BigNumber.from('10000000')
                    });
                    const receipt = await tx.wait();
                    // console.log('receipt: ', receipt);

                    console.log('redeemed: ', l2Hashes[i]);
                    l2Hashes.shift();
                    i = -1;
                    console.log('new l2Hashes: ', l2Hashes);
                    console.log('.');
                }
            }
        }, 900000);
    });

    

}


main();