const axios = require('axios');
const bitcore = require('bitcore-lib');
require('dotenv').config();


async function sendBitcoin(receiverAddr, amountToSend) {
    const sochain_network = "BTCTEST";
    const testBtcWalletAddr = 'tb1qjvvwsccwuakfc0q59hmfx7q8csamnzj0uhd2zy';
    const decimals = 100000000;
    let fee = 0;
    let inputCount = 0;
    let outputCount = 2;
    const satoshisToSend = amountToSend * decimals;
    const satsXfee = 20;

    const utxos = await axios.get(
        `https://sochain.com/api/v2/get_tx_unspent/${sochain_network}/${testBtcWalletAddr}`
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
    transaction.fee(fee * satsXfee); //******* */
    transaction.change(testBtcWalletAddr);
    transaction.sign(process.env.PK_BIT);
    const serializedTx = transaction.serialize();

    const result = await axios({
        method: 'POST',
        url: `https://sochain.com/api/v2/send_tx/${sochain_network}`,
        data: {
            tx_hex: serializedTx
        }
    });

    console.log('the result 2: ', result.data.data);
    return result.data.data;
}

//change PK and address for that of block.io
sendBitcoin('2N113a9zBxhoP4GCvwUt53ScN9WfMar4oDR', 0.0001);
// const result = sendBitcoin('2N113a9zBxhoP4GCvwUt53ScN9WfMar4oDR', 0.0001);
// console.log('the result: ', result);

// async function getTx(x, y) {
//     const utxos = await axios.get(
//         `https://sochain.com/api/v2/get_tx_unspent/${x}/${y}`
//     );
//     console.log(utxos.data.data.txs);
// }

// // const x = getTx();
// // console.log(x);

// getTx('BTCTEST', 'tb1qjvvwsccwuakfc0q59hmfx7q8csamnzj0uhd2zy');