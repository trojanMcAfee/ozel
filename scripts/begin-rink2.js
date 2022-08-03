const { ethers } = require("ethers");
const { parseEther, formatEther, defaultAbiCoder: abiCoder, keccak256 } = ethers.utils;
const { deploy } = require('./deploy.js');
const { Bridge } = require('arb-ts');
const { hexDataLength } = require('@ethersproject/bytes');
require('dotenv').config();

const {
    balanceOfOZL, 
    transferOZL, 
    withdrawShareOZL, 
    getVarsForHelpers,
    sendETH,
    getCalldata,
    getCalldata2
} = require('./helpers-arb.js');

const { 
    chainId,
    pokeMeOpsAddr,
    hopBridge,
    usdtAddrArb,
    wbtcAddr,
    renBtcAddr,
    usdcAddr,
    mimAddr,
    fraxAddr,
    inbox,
    signerX,
    l2Provider,
    l2Signer,
    l1Signer,
    wethAddr,
    defaultSlippage,
    gelatoAddr,
    ETH,
    swapRouterUniAddr,
    poolFeeUni,
    nullAddr,
    chainlinkAggregatorAddr
 } = require('./state-vars.js');


 async function sendTx(params) {
    const [ signer, signer2 ] = await ethers.getSigners();
    const txDetails = {
        to: params.receiver,
        gasLimit: ethers.BigNumber.from('5000000'),
        gasPrice: ethers.BigNumber.from('30897522792')
    };
    const abi = [];
    const signatures = {
        createNewProxy: 'function createNewProxy(tuple(address user, address userToken, uint256 userSlippage) userDetails_)',
        getTaskID: 'function getTaskID(address proxy_) returns (bytes32)',
        sendToArb: `function sendToArb(${params.isEvil ? 'tuple(uint256 maxSubmissionCost, uint256 gasPriceBid, uint256 autoRedeem) varConfig_, tuple(address user, address userToken, uint256 userSlippage) userDetails_)' : ')'}`,
        initialize: `function initialize(${params.args && params.args.length < 2 ? 'address beacon_' : 'uint256 userId_, address beacon_'})`,
        _setBeacon: 'function _setBeacon(address beacon, bytes memory data)',
        changeUserToken: 'function changeUserToken(address newUserToken_)',
        changeUserSlippage: 'function changeUserSlippage(uint256 newUserSlippage_)'
    };


    if (params.isAmount) txDetails.value = parseEther(params.value.toString()); 

    if (params.method !== 'Sending ETH') {
        for (let sign in signatures) {
            if (sign === params.method) {
                signature = signatures[sign];
            }
        }
        abi.push(signature);
        iface = new ethers.utils.Interface(abi);

        if (params.args) {
            data = iface.encodeFunctionData(params.method, params.args); 
        } else {
            data = iface.encodeFunctionData(params.method);
        }
        txDetails.data = data;
    } 
    
    if (!params.isSigner2) {
        tx = await signer.sendTransaction(txDetails);
    } else {
        tx = await signer2.sendTransaction(txDetails);
    }
    const receipt = await tx.wait();
    // console.log(`${method} with hash: `, receipt.transactionHash);
    return receipt;
}