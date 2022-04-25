const axios = require('axios');
const bitcore = require('bitcore-lib');
require('dotenv').config();


async function sendBitcoin(receiverAddr, amountToSend) {
    const sochain_network = "BTCTEST";
    const btcAddr = 'mubUbyPazdyvhPJYPGWUkFWj7bkw1Yq8ys';
    const decimals = 100000000;
    let fee = 0;
    let inputCount = 0;
    let outputCount = 2;
    const satoshisToSend = amountToSend * decimals;
    const satsXfee = 20;

    const utxos = await axios.get(
        `https://sochain.com/api/v2/get_tx_unspent/${sochain_network}/${btcAddr}`
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
    transaction.change(btcAddr);
    transaction.sign(process.env.PK_TEST);
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



sendBitcoin('tb1q296q932z6768eefhk8t3zlctw957dkpxuzwnaw', 0.001); 
//tb1qva5sqtsj86hrdpaheatlvklf3s7dnt6chu4fa3