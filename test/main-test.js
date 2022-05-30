const { ethers } = require("ethers");
const assert = require('assert');
// const expect = require('chai').expect;
// const expect = require('expect');
const truffleAssert = require('truffle-assertions');

const { 
    parseEther, 
    formatEther, 
    defaultAbiCoder: abiCoder, 
    keccak256,
    id,
    hexZeroPad,
    hexStripZeros,
    arrayify
} = ethers.utils;
const { deploy } = require('../scripts/deploy.js');
const { Bridge } = require('arb-ts');
const { hexDataLength } = require('@ethersproject/bytes');
require('dotenv').config();



const {
    balanceOfPYY, 
    transferPYY, 
    withdrawSharePYY, 
    getVarsForHelpers,
    sendETH,
    getCalldata,
    getCalldata2
} = require('../scripts/helpers-arb.js');

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
 } = require('../scripts/state-vars.js');

 const {
    deployContract,
    sendTx,
    getArbitrumParams,
    activateOzBeaconProxy,
    deploySystemOptimistically,
    errors,
    getEventParam
 } = require('../scripts/helpers-eth');









 describe('Ethereum-side', async () => {
    before( async () => {
        const bridge = await Bridge.init(l1Signer, l2Signer);
        ([signerAddr, signerAddr2] = await hre.ethers.provider.listAccounts()); 
        console.log('signer address: ', signerAddr);

        userDetails = [
            signerAddr,
            usdtAddrArb,
            defaultSlippage
        ];
        ([ozERC1967proxyAddr, storageBeacon] = await deploySystemOptimistically(userDetails, signerAddr));
    });

    describe('ozBeaconProxy', async () => {
        it('should create a proxy successfully', async () => {
            await sendTx({
                receiver: ozERC1967proxyAddr,
                method: 'createNewProxy',
                args: [userDetails]
            });
            newProxyAddr = (await storageBeacon.getProxyByUser(signerAddr)).toString(); 
            assert.equal(newProxyAddr.length, 42);
        });


        it('should have an initial balance of 0.01 ETH', async () => {
            await sendTx({
                receiver: newProxyAddr,
                isAmount: true,
                method: 'Sending ETH',
                value: 0.01,
                args: false
            });
            balance = await hre.ethers.provider.getBalance(newProxyAddr);
            // await activateOzBeaconProxy(newProxyAddr);
            assert.equal(formatEther(balance), '0.01');
        });

        it('should have a final balance of 0 ETH', async () => {
            await activateOzBeaconProxy(newProxyAddr);
            balance = await hre.ethers.provider.getBalance(newProxyAddr);
            assert.equal(formatEther(balance), 0);
        });

        describe('fallback() / ozPayMe', async () => {
            it('should fail when re-calling / initialize()', async () => {
                await assert.rejects(async () => {
                    await sendTx({
                        receiver: newProxyAddr,
                        method: 'initialize',
                        args: [0, nullAddr]
                    });
                }, {
                    name: 'Error',
                    message: "VM Exception while processing transaction: reverted with reason string 'Initializable: contract is already initialized'"
                });
            });

            it('should allow the user to change userToken / changeUserToken()', async () => {
                receipt = await sendTx({
                    receiver: newProxyAddr,
                    method: 'changeUserToken',
                    args: [usdcAddr]
                });
                newUserToken = getEventParam(receipt);
                assert.equal(newUserToken, usdcAddr.toLowerCase());
            });

            xit('should not allow an external user to change userToken / changeUserToken()', async () => {
            
            });



            it('should allow the user to change userSlippage / changeUserSlippage()', async () => {
                receipt = await sendTx({
                    receiver: newProxyAddr,
                    method: 'changeUserSlippage',
                    args: ['200']
                });
                newUserSlippage = getEventParam(receipt);
                assert.equal(arrayify(newUserSlippage), '200');
            });



            xit('should fail when calling sendToArb() with malicious data on ozPayMe', function () {
            
            });



        });


    });

    


    


  

    xit('', async () => {
            
    });



  });