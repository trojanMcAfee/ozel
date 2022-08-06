const { ethers } = require("ethers");
const assert = require('assert');
require('dotenv').config();

const { 
    formatEther, 
    arrayify,
    formatBytes32String,
    keccak256,
    toUtf8Bytes
} = ethers.utils;


const { 
    wethAddr,
    pokeMeOpsAddr,
    usdtAddrArb,
    usdcAddr,
    fraxAddr,
    l1Signer,
    defaultSlippage,
    ETH,
    nullAddr,
    deadAddr,
    oz1967ProxyABI
 } = require('../scripts/state-vars.js');

 const {
    deployContract,
    sendTx,
    activateOzBeaconProxy,
    deploySystem,
    getEventParam,
    sendETHv2,
    activateProxyLikeOps,
    compareTopicWith,
    createProxy,
    storeVarsInHelpers,
    compareEventWithVar
 } = require('../scripts/helpers-eth');

 const { err } = require('./errors.js');


 //pass the funcs in helpers-eth to new way of calling a proxy (implABI, proxtAddr)



let signerAddr, signerAddr2;
let ozERC1967proxyAddr, storageBeacon, emitter, emitterAddr, fakeOZLaddr;
let userDetails;
let newProxyAddr, newProxy;
let balance;
let newUserToken, newUserSlippage;
let ops;
let signer2;
let showTicketSignature;
let receipt;
let ticketIDtype;
let pulledUserDetails;
let taskID;
let storageBeaconMockAddr; 
let USDC, WETH;
let usersProxies = [];
let evilVarConfig = [0, 0, 0];
let evilUserDetails = [deadAddr, deadAddr, 0];
let preBalance, postBalance;
let isExist;



 describe('Ethereum-side', async () => {
    before( async () => {
        ([signerAddr, signerAddr2] = await hre.ethers.provider.listAccounts()); 
        console.log('signer address: ', signerAddr);
        console.log('.');

        userDetails = [
            signerAddr,
            usdtAddrArb,
            defaultSlippage 
        ];

        WETH = await hre.ethers.getContractAt('IERC20', wethAddr);
    });

    xdescribe('Optimistic deployment', async () => { 
        before( async () => {
            ([beacon, beaconAddr, ozERC1967proxyAddr, storageBeacon, storageBeaconAddr, emitter, emitterAddr, fakeOZLaddr, varConfig, eMode] = await deploySystem('Optimistically', userDetails, signerAddr));
            storeVarsInHelpers(ozERC1967proxyAddr);
        });

        describe('ProxyFactory', async () => {

            describe('Deploys one proxy', async () => {
                it('should create a proxy successfully / createNewProxy()', async () => {
                    await createProxy(userDetails);
                    newProxyAddr = (await storageBeacon.getProxyByUser(signerAddr))[0].toString(); 
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
        });

        describe('ozBeaconProxy / ozPayMe', async () => {
            describe('fallback()', async () => {
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

                it('shoud not allow to change userToken for the 0 address / changeUserToken()', async () => {
                    await assert.rejects(async () => {
                        await sendTx({
                            receiver: newProxyAddr,
                            method: 'changeUserToken',
                            args: [nullAddr]
                        });
                    }, {
                        name: 'Error',
                        message: err().zeroAddress
                    });
                });

                it('shoud not allow to change userToken for a token not found in the database / changeUserToken()', async () => {
                    await assert.rejects(async () => {
                        await sendTx({
                            receiver: newProxyAddr,
                            method: 'changeUserToken',
                            args: [deadAddr]
                        });
                    }, {
                        name: 'Error',
                        message: err().tokenNotFound
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

                it('should not allow to change userSlippage to 0 / changeUserSlippage()', async () => {
                    await assert.rejects(async () => {
                        await sendTx({
                            receiver: newProxyAddr,
                            method: 'changeUserSlippage',
                            args: ['0']
                        });
                    }, {
                        name: 'Error',
                        message: err().zeroSlippage
                    });
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
            it('shoud not allow an user to issue an userID / issueUserID()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.issueUserID(evilUserDetails);
                }, {
                    name: 'Error',
                    message: err(1).notAuthorized 
                });
            });

            it('should not allow an user to save a proxy / saveUserProxy()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.saveUserProxy(signerAddr2, deadAddr);
                }, {
                    name: 'Error',
                    message: err(1).notAuthorized 
                });
            });

            it('should not allow an user to save a taskId / saveTaskId()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.saveTaskId(deadAddr, formatBytes32String('evil data'));
                }, {
                    name: 'Error',
                    message: err(1).notAuthorized 
                });
            });

            it('should allow the owner to change VariableConfig / changeVariableConfig()', async () => {
                await storageBeacon.changeVariableConfig(varConfig);
            });

            it('should not allow an external user to change VariableConfig / changeVariableConfig()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.connect(signer2).changeVariableConfig(varConfig);
                }, {
                    name: 'Error',
                    message: err().notOwner 
                });
            });

            it('should allow the owner to add a new userToken to the database', async () => {
                await storageBeacon.addTokenToDatabase(fraxAddr);
            });

            it('should not allow an external user to add a new userToken to the database', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.connect(signer2).addTokenToDatabase(deadAddr);
                }, {
                    name: 'Error',
                    message: err().notOwner 
                });
            });

            it('should not allow re-calling / storeBeacon()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.storeBeacon(deadAddr);
                }, {
                    name: 'Error',
                    message: err().alreadyInitialized 
                });
            });

            it('should allow the onwer to change Emergency Mode / changeEmergencyMode()', async () => {
                await storageBeacon.changeEmergencyMode(eMode);
            });

            it('should not allow an external user to change Emergency Mode / changeEmergencyMode()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.connect(signer2).changeEmergencyMode(eMode);
                }, {
                    name: 'Error',
                    message: err().notOwner 
                });
            });

            it('should allow the owner to disable the Emitter / changeEmitterStatus()', async () => {
                await storageBeacon.changeEmitterStatus(true);
                await sendETHv2(newProxyAddr, 0.01);
                receipt = await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr);
                const ticketIDtype = compareTopicWith('Signature', showTicketSignature, receipt);
                assert.equal(ticketIDtype, false);
                await storageBeacon.changeEmitterStatus(false);
            });
    
            it('should not allow an external user to disable the Emitter / changeEmitterStatus()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.connect(signer2).changeEmitterStatus(true);
                }, {
                    name: 'Error',
                    message: err().notOwner 
                });
            });

            it('should return the userDetails / getUserDetailsById()', async () => {
                userDetails[1] = usdtAddrArb;
                pulledUserDetails = await storageBeacon.getUserDetailsById(0);
                assert.equal(pulledUserDetails[0], userDetails[0]);
                assert.equal(pulledUserDetails[1], userDetails[1]);
                assert.equal(pulledUserDetails[2], userDetails[2]);
            });

            it('should return zero values when querying with a non-user / getUserDetailsById()', async () => {
                pulledUserDetails = await storageBeacon.getUserDetailsById(100);
                assert.equal(pulledUserDetails[0], nullAddr);
                assert.equal(pulledUserDetails[1], nullAddr);
                assert.equal(pulledUserDetails[2], 0);
            });

            it('should return the proxies an user has / getProxyByUser()', async () => {
                userProxies = await storageBeacon.getProxyByUser(signerAddr);
                assert(userProxies.length > 0);
            });

            it('should return an empty array when querying with a non-user / getProxyByUser()', async () => {
                userProxies = await storageBeacon.getProxyByUser(deadAddr);
                assert(userProxies.length === 0);
            });

            it("should get an user's taskID / getTaskID()", async () => {
                userProxies = await storageBeacon.getProxyByUser(signerAddr);
                taskID = (await storageBeacon.getTaskID(userProxies[0])).toString();
                assert(taskID.length > 0);
            });

            it("should return a zero taskID when querying with a non-user / getTaskID()", async () => {
                taskID = (await storageBeacon.getTaskID(deadAddr)).toString();
                assert.equal(taskID, formatBytes32String(0));
            });

            it('should return true for an user / isUser()', async () => {
                assert(await storageBeacon.isUser(signerAddr));
            });

            it('should return false for a non-user / isUser()', async () => {
                assert(!(await storageBeacon.isUser(deadAddr)));
            });

            it('should get the Emitter status / getEmitterStatus()', async () => {
                assert(!(await storageBeacon.getEmitterStatus()));
            });
        });

        describe('ozUpgradeableBeacon', async () => {

            it('should allow the owner to upgrade the Storage Beacon / upgradeStorageBeacon()', async () => {
                [storageBeaconMockAddr , storageBeaconMock] = await deployContract('StorageBeaconMock', l1Signer);
                await beacon.upgradeStorageBeacon(storageBeaconMockAddr);
            });

            it('should not allow an external user to upgrade the Storage Beacon / upgradeStorageBeacon()', async () => {
                signer2 = await hre.ethers.provider.getSigner(signerAddr2);
                await assert.rejects(async () => {
                    await beacon.connect(signer2).upgradeStorageBeacon(storageBeaconMockAddr);
                }, {
                    name: 'Error',
                    message: err().notOwner
                });
            });

            it('should allow the owner to upgrade the implementation and use with the new version of storageBeacon / upgradeTo()', async () => {
                const [ implMockAddr ] = await deployContract('ImplementationMock', l1Signer);
                await beacon.upgradeTo(implMockAddr);

                //execute a normal tx to proxy and read from the new variable placed on implMock
                await sendETHv2(newProxyAddr, 1.5);
                balance = await hre.ethers.provider.getBalance(newProxyAddr);
                assert.equal(formatEther(balance), '1.5');

                receipt = await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                balance = await hre.ethers.provider.getBalance(newProxyAddr);
                assert.equal(formatEther(balance), 0);  

                isExist = await compareEventWithVar(receipt, 11);
                assert(isExist);
            });
        });
    });


    describe('Pesimistic deployment', async () => {
        before( async () => {
            //autoRedeem set to 0
            ([beacon, beaconAddr, ozERC1967proxyAddr, storageBeacon, storageBeaconAddr, emitter, emitterAddr, fakeOZLaddr, varConfig, eMode] = await deploySystem('Pessimistically', userDetails, signerAddr));
            storeVarsInHelpers(ozERC1967proxyAddr);
        });

        describe('ozBeaconProxy / ozPayMe', async () => {
            it('should create a proxy successfully / createNewProxy()', async () => {
                await createProxy(userDetails);
                newProxyAddr = (await storageBeacon.getProxyByUser(signerAddr))[0].toString(); 
                assert.equal(newProxyAddr.length, 42);
            });

            it('should have an initial balance of 100 ETH', async () => {
                await sendETHv2(newProxyAddr, 100);
                balance = await hre.ethers.provider.getBalance(newProxyAddr);
                assert.equal(formatEther(balance), '100.0');
            });

            it('should run EmergencyMode successfully / _runEmergencyMode()', async () => {
                USDC = await hre.ethers.getContractAt('IERC20', usdcAddr);
                balance = await USDC.balanceOf(signerAddr);
                assert.equal(Number(balance), 0);

                await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                balance = await USDC.balanceOf(signerAddr);
                assert(Number(balance) > 0);
            });

            it("should send the ETH back to the user as last resort / _runEmergencyMode()", async () => {
                //UserSlippage is change to 1 to produce a slippage error derived from priceMinOut calculation
                await sendETHv2(newProxyAddr, 100);
                await sendTx({
                    receiver: newProxyAddr,
                    method: 'changeUserSlippage',
                    args: ['1']
                });

                preBalance = await WETH.balanceOf(signerAddr);
                assert.equal(preBalance, 0);
                await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                postBalance = await WETH.balanceOf(signerAddr);
                assert(postBalance > 0);

                //Clean up
                await WETH.transfer(deadAddr, postBalance);
            });

            it('should execute the USDC swap in the second attempt / FaultyOzPayMe - _runEmergencyMode()', async () => {
                const [ faultyOzPayMeAddr ] = await deployContract('FaultyOzPayMe', l1Signer);
                await beacon.upgradeTo(faultyOzPayMeAddr);
                await sendTx({
                    receiver: newProxyAddr,
                    method: 'changeUserSlippage',
                    args: [defaultSlippage.toString()]
                });
                
                await sendETHv2(newProxyAddr, 100);

                preBalance = await USDC.balanceOf(signerAddr);
                receipt = await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                postBalance = await USDC.balanceOf(signerAddr);
                assert(preBalance < postBalance);

                isExist = await compareEventWithVar(receipt, 23);
                assert(isExist);
            });

            /**
             * Modifies the selector in the calldata of setTestReturnContract() for changeUserSlippage()
             * so it passes the filter of newProxy and goes to changeUserSlippage() instead of sendToArb().
             * 
             * Check changeUserSlippage() on FaultyOzPayMe2
             */
            it('should send ETH back to the user when the emergency swap returns 0 at the 2nd attempt / FaultyOzPayMe2 - _runEmergencyMode()', async () => {
                const [ faultyOzPayMe2Addr ] = await deployContract('FaultyOzPayMe2', l1Signer);
                await beacon.upgradeTo(faultyOzPayMe2Addr);       
                const [ testReturnAddr ] = await deployContract('TestReturn', l1Signer);

                iface = new ethers.utils.Interface(oz1967ProxyABI);
                selectorTest = iface.getSighash('setTestReturnContract');
                selectorSlipp = iface.getSighash('changeUserSlippage');
                
                position = keccak256(toUtf8Bytes('test.position'));
                encodedData = iface.encodeFunctionData('setTestReturnContract', [
                    testReturnAddr,
                    position
                ]);
                changedData = encodedData.replace(selectorTest, selectorSlipp);
                
                const signer = await hre.ethers.provider.getSigner(signerAddr);
                await signer.sendTransaction({
                    to: newProxyAddr,
                    data: changedData
                });

                await sendETHv2(newProxyAddr, 100);

                preBalance = await WETH.balanceOf(signerAddr);
                assert.equal(preBalance, 0);
                await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                postBalance = await WETH.balanceOf(signerAddr);
                assert(postBalance > 0);

                isExist = await compareEventWithVar(receipt, 23);
                assert(isExist);
            });
        });
    });
  });