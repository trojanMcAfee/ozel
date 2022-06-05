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
    chainlinkAggregatorAddr,
    deadAddr
 } = require('../scripts/state-vars.js');

 const {
    deployContract,
    sendTx,
    getArbitrumParams,
    activateOzBeaconProxy,
    deploySystemOptimistically,
    errors,
    getEventParam,
    sendETHv2,
    activateProxyLikeOps,
    compareTopicWith,
    deployAnotherStorageBeacon,
    createProxy,
    storeVarsInHelpers
 } = require('../scripts/helpers-eth');

 const { err } = require('./errors.js');



let signerAddr, signerAddr2;
let ozERC1967proxyAddr, storageBeacon, emitter, emitterAddr, fakePYYaddr;
let userDetails;
let newProxyAddr, newProxy;
let balance;
let newUserToken, newUserSlippage;
let user;
let ops;
let signer2;
let showTicketSignature;
let isSuccess;
let otherStorageBeaconAddr;
let tx, receipt;
let ticketIDtype, ticketID;
let modUserDetails;
let usersProxies = [];



 describe('Ethereum-side', async () => {
    console.log('.');
    before( async () => {
        const bridge = await Bridge.init(l1Signer, l2Signer);
        ([signerAddr, signerAddr2] = await hre.ethers.provider.listAccounts()); 
        console.log('signer address: ', signerAddr);

        userDetails = [
            signerAddr,
            usdtAddrArb,
            defaultSlippage
        ];

        ([ozERC1967proxyAddr, storageBeacon, emitter, emitterAddr, fakePYYaddr] = await deploySystemOptimistically(userDetails, signerAddr));
        storeVarsInHelpers(ozERC1967proxyAddr);
    });

    describe('Optimistic deployment', async () => { 

        describe('ozBeaconProxy', async () => {

            describe('Deploys one proxy', async () => {
                it('should create a proxy successfully / createNewProxy()', async () => {
                    await createProxy(userDetails);
                    newProxyAddr = (await storageBeacon.getProxyByUser(signerAddr))[0].toString(); 
                    // console.log('Proxy #1: ', newProxyAddr);
                    assert.equal(newProxyAddr.length, 42);
                });

                it('should not allow to create a proxy with the 0 address / createNewProxy()', async () => {
                    userDetails[1] = nullAddr;
                    await assert.rejects(async () => {
                        await createProxy(userDetails);
                    }, {
                        name: 'Error',
                        message: err().zeroAddress 
                    });
                });

                it('should not allow to create a proxy with 0 slippage / createNewProxy()', async () => {
                    userDetails[1] = usdtAddrArb;
                    userDetails[2] = 0;
                    await assert.rejects(async () => {
                        await createProxy(userDetails);
                    }, {
                        name: 'Error',
                        message: err().zeroSlippage
                    });
                });

                it('should not allow to create a proxy with a userToken not found in the database / createNewProxy()', async () => {
                    userDetails[1] = deadAddr;
                    userDetails[2] = defaultSlippage;
                    await assert.rejects(async () => {
                        await createProxy(userDetails);
                    }, {
                        name: 'Error',
                        message: err().tokenNotFound
                    });
                })
    
                it('should have an initial balance of 0.01 ETH', async () => {
                    await sendETHv2(newProxyAddr, 0.01);
                    balance = await hre.ethers.provider.getBalance(newProxyAddr);
                    assert.equal(formatEther(balance), '0.01');
                });
    
                it('should have a final balance of 0 ETH', async () => {
                    await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                    balance = await hre.ethers.provider.getBalance(newProxyAddr);
                    assert.equal(formatEther(balance), 0);
                });
            });


            describe('Deploys 5 proxies', async () => {
                it('should create 5 proxies successfully / createNewProxy()', async () => {
                    userDetails[1] = usdcAddr;
                    for (let i=0; i < 5; i++) {
                        await createProxy(userDetails);
                        newProxyAddr = (await storageBeacon.getProxyByUser(signerAddr))[i].toString(); 
                        usersProxies.push(newProxyAddr);
                        assert.equal(newProxyAddr.length, 42);
                    }
                });
    
                it('should have the 5 proxies with an initial balance of 100 ETH each / createNewProxy()', async () => {
                    await sendETHv2(newProxyAddr, 100);
                    balance = await hre.ethers.provider.getBalance(newProxyAddr);
                    assert.equal(formatEther(balance), '100.0');
                });
    
                it('should leave each of the 5 proxies with a final balance of 0 ETH / createNewProxy()', async () => {
                    for (let i=0; i < usersProxies.length; i++) {
                        await activateProxyLikeOps(usersProxies[i], ozERC1967proxyAddr);
                        balance = await hre.ethers.provider.getBalance(usersProxies[i]);
                        assert.equal(formatEther(balance), 0);
                    }
                });
            });

            

            describe('fallback() / ozPayMe', async () => {
                it('should not allow re-calling / initialize()', async () => {
                    await assert.rejects(async () => {
                        await sendTx({
                            receiver: newProxyAddr,
                            method: 'initialize',
                            args: [0, nullAddr]
                        });
                    }, {
                        name: 'Error',
                        message: err().alreadyInitialized 
                    });
                });

                it('should not allow when not Ops calls / sendToArb()', async () => {
                    await assert.rejects(async () => {
                        await activateOzBeaconProxy(newProxyAddr);
                    }, {
                        name: 'Error',
                        message: err().onlyOps 
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

                it('should not allow an external user to change userToken / changeUserToken()', async () => {
                    await assert.rejects(async () => {
                        await sendTx({
                            receiver: newProxyAddr,
                            method: 'changeUserToken',
                            args: [usdcAddr],
                            isSigner2: true
                        });
                    }, {
                        name: 'Error',
                        message: err().notAuthorized
                    });
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

                it('should not allow an external user to change userSlippage / changeUserSlippage()', async () => {
                    await assert.rejects(async () => {
                        await sendTx({
                            receiver: newProxyAddr,
                            method: 'changeUserSlippage',
                            args: ['200'],
                            isSigner2: true
                        });
                    }, {
                        name: 'Error',
                        message: err().notAuthorized
                    });
                });

                it('should allow funds to be sent with correct userDetails even if malicious data was passed / sendToArb() - delegate()', async () => {
                    newProxy = await hre.ethers.getContractAt('ozBeaconProxy', newProxyAddr);
                    ops = await hre.ethers.getContractAt('IOps', pokeMeOpsAddr);
                    signer2 = await hre.ethers.provider.getSigner(signerAddr2);
                    evilVarConfig = [0, 0, 0];
                    evilUserDetails = [deadAddr, deadAddr, 0];

                    await ops.connect(signer2).createTaskNoPrepayment(
                        newProxyAddr,
                        0xaa309254, //first 4 bytes of sendToArb(tuplex2)
                        newProxyAddr,
                        0xcf5303cf, //first 4 bytes of checker()
                        ETH
                    );

                    await sendETHv2(newProxyAddr, 0.01);
                    const receipt = await activateProxyLikeOps(newProxyAddr, signerAddr2, true, [evilVarConfig, evilUserDetails]);

                    balance = await hre.ethers.provider.getBalance(newProxyAddr);
                    assert.equal(balance.toString(), 0);

                    const areEqual = compareTopicWith('Signer', signerAddr, receipt);
                    assert.equal(areEqual, true);
                });
            });
        });

        describe('Emitter', async () => {

            it('should emit ticket ID / forwardEvent()', async () => {
                await sendETHv2(newProxyAddr, 0.01);
                receipt = await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr);
                showTicketSignature = '0xbca70dc8f665e75505547ec15f8c9d9372ac2b33c1746a7e01b805dae21f6696';
                ticketIDtype = compareTopicWith('Signature', showTicketSignature, receipt);
                assert(ticketIDtype, 'number');
            });
    
            it('should not allow an unauhtorized user to emit ticketID / forwardEvent()', async () => {
                await assert.rejects(async () => {
                    await emitter.forwardEvent(000000);
                }, {
                    name: 'Error',
                    message: err().notProxy 
                });
            });
    
            it('should not allow to set a new Beacon / storeBeacon()', async () => {
                await assert.rejects(async () => {
                    await emitter.storeBeacon(nullAddr);
                }, {
                    name: 'Error',
                    message: err().alreadyInitialized 
                });
            }); 
    
    
        });
    
        describe('StorageBeacon', async () => {
    
            it('should allow the owner to disable the Emitter', async () => {
                await storageBeacon.changeEmitterStatus(true);
                await sendETHv2(newProxyAddr, 0.01);
                receipt = await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr);
                const ticketIDtype = compareTopicWith('Signature', showTicketSignature, receipt);
                assert.equal(ticketIDtype, false);
            });
    
            it('should not allow an external user to disable the Emitter', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.connect(signer2).changeEmitterStatus(true);
                }, {
                    name: 'Error',
                    message: err().notOwner 
                });
            });
    
        });
    });

    

    


    


  

    


  });