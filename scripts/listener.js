const bitcoin = require('bitcoinjs-lib');
const zmq = require('zeromq');
const Redis = require('redis');
const Client = require('bitcoin-core');

const { executeBridge } = require('./exec-bridge.js'); 

require('dotenv').config();


const bitPayAddr = 'tb1q0wgk0sf8ucsvh8kmhj4ynnum8pse98mkw45rpl';
const testAddress = 'mubUbyPazdyvhPJYPGWUkFWj7bkw1Yq8ys';

async function run() {
    const bitcoinClient = new Client({ 
        network: 'testnet', 
        username: 'rulmias', 
        password: 'neQFZWZk@X79rwschXxvq3NwCBKzfMec3', 
        port: 18332 
    });

    //after solving the address gap limit, create an address within my wallet, send btc to it (save it redis), parse with zeromq
    //and move the btc to renVM ----> basically do a simulation of the app

    const checkOnRedis = async (address) => await redisClient.get(address);
    
    const redisClient = Redis.createClient();
    redisClient.on('error', (err) => console.log('Redis client error ', err));
    await redisClient.connect();
    if (!checkOnRedis(testAddress)) {
        await redisClient.set(testAddress, 1);
        console.log(testAddress + ' saved on Redis');
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



async function sendBitcoinCore(receiverAddr) {
    const bitcoinClient = new Client({ 
        network: 'testnet', 
        username: 'rulmias', 
        password: 'neQFZWZk@X79rwschXxvq3NwCBKzfMec3', 
        port: 18332 
    });
    const data = await bitcoinClient.sendToAddress(receiverAddr, 0.0003);
}







