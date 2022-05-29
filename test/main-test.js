const { ethers } = require("ethers");
const { assert } = require("chai");
const { parseEther, formatEther, defaultAbiCoder: abiCoder, keccak256 } = ethers.utils;
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
    errors
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
            await sendTx(ozERC1967proxyAddr, false, 'createNewProxy', [userDetails]);
            newProxyAddr = (await storageBeacon.getProxyByUser(signerAddr)).toString(); 
            assert.equal(newProxyAddr.length, 42);
        });


        it('should have an initial balance of 0.01 ETH', async () => {
            await sendTx(newProxyAddr, true, 'Sending ETH', '', 0.01);
            balance = await hre.ethers.provider.getBalance(newProxyAddr);
            await activateOzBeaconProxy(newProxyAddr);
            assert.equal(formatEther(balance), '0.01');
        });

        it('should have a final balance of 0 ETH', async () => {
            await sendTx(newProxyAddr, true, 'Sending ETH', '', 0.01);
            await activateOzBeaconProxy(newProxyAddr);
            balance = await hre.ethers.provider.getBalance(newProxyAddr);
            assert.equal(formatEther(balance), 0);
        });

        describe('fallback() / ozPayMe', async () => {
            it('should fail when re-calling / initialize()', async () => {
                // assert.throws(async () => {
                //     await sendTx(newProxyAddr, false, 'initialize', [0, nullAddr]);
                // }, Error);

                try {
                    await sendTx(newProxyAddr, false, 'initialize', [0, nullAddr]);
                } catch(e) {
                    assert.equal(typeof e, 'object');
                }
            });

            xit('should allow the user to change userToken / changeUserToken()', async () => {
                await sendTx(newProxyAddr, false, 'changeUserToken', [usdcAddr]); //continu on this test

            });



            xit('should fail when calling sendToArb() with malicious data on ozPayMe', function () {
            
            });



        });


    });

    


    


  

    xit('', async () => {
            
    });



  });