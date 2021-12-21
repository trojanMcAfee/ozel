const axios = require('axios');
const bitcore = require('bitcore-lib');

const bitcoin = require('bitcoinjs-lib');
const zmq = require('zeromq');

require('dotenv').config();


async function run() {
    const sock = new zmq.Subscriber;

    sock.connect("tcp://127.0.0.1:29000");
    sock.subscribe('rawtx');
    console.log('Subscriber connected to port 29000');

    for await (const [topic, msg] of sock) {
        if (topic.toString() === 'rawtx') {
            const rawtx = msg.toString('hex');
    
            //use bitcoinjs-lib to decode the raw tx
            const tx = bitcoin.Transaction.fromHex(rawtx);
            const txid = tx.getId();
            console.log('Tx Hash Id: ', txid);

            let address = bitcoin.address.fromOutputScript(tx.outs[0].script, bitcoin.networks.testnet); //testnet-regtest-mainnet or bitcoin (?)
            console.log('Receiving address 1: ', address);

            console.log('.');
            address = bitcoin.address.fromOutputScript(tx.outs[1].script, bitcoin.networks.testnet); 
            console.log('Receiving address 2: ', address);

        }
    }

}

run();


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


async function sendBitcoin(receiverAddr, amountToSend, sendingAddr, senderPK) {
    const sochain_network = "BTCTEST";
    const decimals = 100000000;
    let fee = 0;
    let inputCount = 0;
    let outputCount = 2;
    const satoshisToSend = amountToSend * decimals;
    const satsXfee = 20;

    const utxos = await axios.get(
        `https://sochain.com/api/v2/get_tx_unspent/${sochain_network}/${sendingAddr}`
    );

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
        url: `https://sochain.com/api/v2/send_tx/${sochain_network}`,
        data: {
            tx_hex: serializedTx
        }
    });

    console.log('the result: ', result.data.data);
    return result.data.data;
}


// module.exports = {
//     sendBitcoin
// };


