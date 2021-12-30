const axios = require('axios');
const bitcore = require('bitcore-lib');

const bitcoin = require('bitcoinjs-lib');
const zmq = require('zeromq');

const Redis = require('redis');

require('dotenv').config();


async function run() {
    const testAddress = 'mubUbyPazdyvhPJYPGWUkFWj7bkw1Yq8ys';
    const checkOnRedis = async (address) => await redisClient.get(address);
    
    const redisClient = Redis.createClient();
    redisClient.on('error', (err) => console.log('Redis client error ', err));
    await redisClient.connect();
    if (!checkOnRedis(testAddress)) {
        await redisClient.set(testAddress, 1);
        console.log('Saved on Redis');
    }

    sendBitcoinCore(testAddress);

    const sock = new zmq.Subscriber;
    sock.connect("tcp://127.0.0.1:29000");
    sock.subscribe('rawtx');
    console.log('Subscriber connected to port 29000');

    for await (const [topic, msg] of sock) {
        if (topic.toString() === 'rawtx') {
            const rawtx = msg.toString('hex');
            const tx = bitcoin.Transaction.fromHex(rawtx);
            let address1;
            let address2;
            try {
                address1 = bitcoin.address.fromOutputScript(tx.outs[0].script, bitcoin.networks.testnet); 
                address2 = bitcoin.address.fromOutputScript(tx.outs[1].script, bitcoin.networks.testnet);
            } catch(e) {}
            if (( testAddress === address1 || testAddress === address2 ) && checkOnRedis(testAddress)) {
                const matchingAddress = testAddress === address1 ? address1 : address2;
                const txid = tx.getId();
                console.log('Tx Hash Id: ', txid);
                console.log('address: ', matchingAddress);
            }
        }
    }

}
run();


async function tryRedis() {
    const redisClient = Redis.createClient();
    redisClient.on('error', (err) => console.log('Redis client error ', err));
    await redisClient.connect();

    await redisClient.set('mubUbyPazdyvhPJYPGWUkFWj7bkw1Yq8ys', 1);
    // await redisClient.hSet('a', 'b', 'c');
    console.log('Saved on Redis');

    // const value = await redisClient.hmGet('a', 'b');
    const value = await redisClient.get('mubUbyPazdyvhPJYPGWUkFWj7bkw1Yq8ys');
    console.log('value: ', value);
}
// tryRedis();


async function listenFor() {
    const NETWORK = 'BTCTEST';
    const ADDRESS = 'mubUbyPazdyvhPJYPGWUkFWj7bkw1Yq8ys';

    // const balance = await axios.get(
    //     `https://sochain.com/api/v2/get_address_balance/${NETWORK}/${ADDRESS}`
    // );
    // console.log('balance: ', balance.data.data.confirmed_balance);

    setInterval(async () => {
        const balance = await axios.get(
            `https://sochain.com/api/v2/get_address_balance/${NETWORK}/${ADDRESS}`
        );
        console.log('balance: ', balance.data.data.confirmed_balance);
    }, 5000);

}
// listenFor();

async function sendBitcoinCore(receiverAddr) {
    const bitPayAddr = 'tb1q0wgk0sf8ucsvh8kmhj4ynnum8pse98mkw45rpl';

    const Client = require('bitcoin-core');
    const client = new Client({ 
        network: 'testnet', 
        username: 'rulmias', 
        password: 'neQFZWZk@X79rwschXxvq3NwCBKzfMec3', 
        port: 18332 
    });

    const data = await client.sendToAddress(receiverAddr, 0.0003);
}




async function sendBitcoin(receiverAddr, amountToSend, sendingAddr, senderPK) {
    const sochain_network = "BTCTEST";
    const decimals = 100000000;
    let fee = 0;
    let inputCount = 0;
    let outputCount = 2;
    const satoshisToSend = amountToSend * decimals;
    const satsXfee = 20;

    console.log('hello');
    // const utxos = await axios.get(
    //     `https://sochain.com/api/v2/get_tx_unspent/${sochain_network}/${sendingAddr}`
    // );
    const utxos = await axios.get(
        'http://127.0.0.1:8333/api/BTC/testnet/address/mubUbyPazdyvhPJYPGWUkFWj7bkw1Yq8ys/balance'
    );
    console.log('hello2');

    const transaction = new bitcore.Transaction();
    let totalAmountAvailable = 0;
    let inputs = [];
    utxos.data.data.txs.forEach(async (element) => {
        let utxo = {};

        utxo.satoshis = Math.floor(Number(element.value) * decimals);
        utxo.script = element.script_hex;
        utxo.address = utxos.data.data.address;
        utxo.txId = element.txid;
        utxo.outputIndex = element.output_no;

        totalAmountAvailable += utxo.satoshis;
        inputCount++;
        inputs.push(utxo);
    });

    transaction.from(inputs);

    const transactionSize = inputCount * 180 + outputCount * 34 + 10 - inputCount;
    fee = transactionSize * satsXfee;

    if (totalAmountAvailable - satoshisToSend < 0) {
        throw new Error('Balance is too low for this transaction');
    }

    transaction.to(receiverAddr, satoshisToSend);
    transaction.fee(fee); 
    transaction.change(sendingAddr);
    transaction.sign(senderPK);
    const serializedTx = transaction.serialize();

    const result = await axios({
        method: 'POST',
        // url: `https://sochain.com/api/v2/send_tx/${sochain_network}`,
        url: 'http://127.0.0.1:8333',
        data: {
            tx_hex: serializedTx
        }
    });

    console.log('the result: ', result.data.data);
    return result.data.data;
}

const bitPayAddr = 'tb1q0wgk0sf8ucsvh8kmhj4ynnum8pse98mkw45rpl';
// sendBitcoin(bitPayAddr, 0.0001, 'mubUbyPazdyvhPJYPGWUkFWj7bkw1Yq8ys', process.env.PK_TEST);


// module.exports = {
//     sendBitcoin
// };


