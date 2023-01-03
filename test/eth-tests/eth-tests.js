const { ethers } = require("ethers");
const assert = require('assert');
require('dotenv').config();

const { 
    formatEther, 
    formatBytes32String,
    parseEther
} = ethers.utils;


const { 
    wethAddr,
    pokeMeOpsAddr,
    usdtAddrArb,
    usdcAddr,
    fraxAddr,
    defaultSlippage,
    ETH,
    nullAddr,
    deadAddr,
    proxyABIeth,
    factoryABI,
    ops,
    mimAddr,
    wbtcAddr
 } = require('../../scripts/state-vars.js');

 const {
    deployContract,
    activateOzBeaconProxy,
    deploySystem,
    getEventParam,
    activateProxyLikeOps,
    compareTopicWith,
    compareEventWithVar,
    compareTopicWith2,
    sendETH,
    createProxy
 } = require('../../scripts/helpers-eth');

 const { err } = require('../errors.js');



let signerAddr, signerAddr2;
let ozERC1967proxyAddr, storageBeacon, emitter, fakeOZLaddr, proxyFactoryAddr;
let accountDetails;
let newProxyAddr, newProxy, newFactoryAddr;
let balance, tokens;
let newUserToken, newUserSlippage, newSlippage;
let opsContract, impl;
let signers;
let showTicketSignature;
let taskID;
let storageBeaconMockAddr; 
let USDC, WETH;
let usersProxies = [];
let evilVarConfig = [0, 0, 0];
let evilUserDetails = [deadAddr, deadAddr, 0, 'nothing'];
let preBalance, postBalance;
let isExist, proxyFactory;
let tx, receipt;
let fakeOzl, volume;
let names, proxies, slippage;
let isAuthorized, newSelector;



 describe('Ethereum-side', async function () {
    this.timeout(10000000);

    before( async () => {
        ([signerAddr, signerAddr2] = await hre.ethers.provider.listAccounts()); 
        console.log('signer address: ', signerAddr);
        console.log('.');

        accountDetails = [
            signerAddr,
            usdtAddrArb,
            defaultSlippage,
            'my account'
        ];

        WETH = await hre.ethers.getContractAt('IERC20', wethAddr);
        signers = await hre.ethers.getSigners();
    });

    describe('Optimistic deployment', async function () { 
        before( async () => {
            ([
                beacon, 
                beaconAddr, 
                ozERC1967proxyAddr, 
                storageBeacon, 
                storageBeaconAddr, 
                emitter, 
                emitterAddr, 
                fakeOZLaddr, 
                eMode,
                proxyFactoryAddr
            ] = await deploySystem('Optimistically', signerAddr));

            proxyFactory = await hre.ethers.getContractAt(factoryABI, ozERC1967proxyAddr);
            fakeOzl = await hre.ethers.getContractAt('FakeOZL', fakeOZLaddr);
        });

        describe('ProxyFactory', async () => {
            describe('Deploys one account', async () => {
                it('should create a account successfully / createNewProxy()', async () => {
                    await proxyFactory.createNewProxy(accountDetails, ops);
                    ([ proxies, names ] = await storageBeacon.getAccountsByUser(signerAddr));

                    newProxyAddr = proxies[0].toString(); 
                    const name = names[0].toString();
                    assert.equal(newProxyAddr.length, 42);
                    assert(name.length > 0);
                });

                it('should not allow to create a account witn an empty account name / createNewProxy()', async () => {
                    accountDetails[3] = '';
                    await assert.rejects(async () => {
                        await proxyFactory.createNewProxy(accountDetails, ops);
                    }, {
                        name: 'Error',
                        message: (await err()).zeroName 
                    });

                    //Clean up
                    accountDetails[3] = 'my account';
                });

                it('should not allow to create a account with a name with more of 18 characters / createNewProxy()', async () => {
                    const invalidName = 'fffffffffffffffffff';
                    assert(invalidName.length > 18);
                    accountDetails[3] = invalidName;

                    await assert.rejects(async () => {
                        await proxyFactory.createNewProxy(accountDetails, ops);
                    }, {
                        name: 'Error',
                        message: (await err()).invalidName 
                    });

                    //Clean up
                    accountDetails[3] = 'my account';
                });

                it('should not allow to create a account with the 0 address / createNewProxy()', async () => {
                    accountDetails[1] = nullAddr;
                    await assert.rejects(async () => {
                        await proxyFactory.createNewProxy(accountDetails, ops);
                    }, {
                        name: 'Error',
                        message: (await err()).zeroAddress 
                    });
                });

                it('should not allow to create a account with 0 slippage / createNewProxy()', async () => {
                    accountDetails[1] = usdtAddrArb;
                    accountDetails[2] = 0;
                    await assert.rejects(async () => {
                        await proxyFactory.createNewProxy(accountDetails, ops);
                    }, {
                        name: 'Error',
                        message: (await err()).zeroSlippage
                    });
                });

                it('should not allow to create a account with a token not found in the database / createNewProxy()', async () => {
                    accountDetails[1] = deadAddr;
                    accountDetails[2] = defaultSlippage;
                    await assert.rejects(async () => {
                        await proxyFactory.createNewProxy(accountDetails, ops);
                    }, {
                        name: 'Error',
                        message: (await err(deadAddr)).tokenNotFound
                    });
                })
    
                it('should have an initial balance of 0.1 ETH', async () => { 
                    accountDetails[1] = usdtAddrArb;
                    newProxyAddr = await createProxy(proxyFactory, accountDetails);

                    balance = await sendETH(newProxyAddr, 0.1);
                    assert.equal(formatEther(balance), '0.1');
                });
    
                it('should have a final balance of 0 ETH', async () => {
                    newProxyAddr = await createProxy(proxyFactory, accountDetails);
                    balance = await hre.ethers.provider.getBalance(newProxyAddr);
                    if (Number(balance) === 0) await sendETH(newProxyAddr, 0.1);

                    await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                    balance = await hre.ethers.provider.getBalance(newProxyAddr);
                    assert.equal(formatEther(balance), 0);
                });
            });

            describe('Deploys 5 accounts', async () => { 
                before(async () => {
                    accountDetails[1] = usdcAddr;
                    for (let i=0; i < 5; i++) {
                        accountDetails[3] = `my account #${i}`;
                        newProxyAddr = await createProxy(proxyFactory, accountDetails);
                        usersProxies.push(newProxyAddr);
                        assert.equal(newProxyAddr.length, 42);
                    }
                    ([ proxies, names ] = await storageBeacon.getAccountsByUser(signerAddr));
                });

                it('deploys 5 accounts with an initial balance of 100 ETH each / createNewProxy()', async () => {
                    for (let i=0; i < proxies.length; i++) {
                        balance = await sendETH(proxies[i], 100);
                        assert(formatEther(balance) === '100.0' || formatEther(balance) === '100.1');
                    }
                });
    
                it('should leave each of the 5 accounts with a final balance of 0 ETH / createNewProxy()', async () => {
                    for (let i=0; i < proxies.length; i++) {
                        await activateProxyLikeOps(proxies[i], ozERC1967proxyAddr);
                        balance = await hre.ethers.provider.getBalance(proxies[i]);
                        assert.equal(formatEther(balance), 0);
                    }
                });
            });

            describe('Upgrade the Factory', async () => {
                it('should return the current implementation of the Proxy Factory / ozERC1967Proxy - getImplementation()', async () => {
                    impl = await proxyFactory.getImplementation();
                    assert.equal(impl, proxyFactoryAddr);
                });

                it('should allow the owner to upgrade the Proxy Factory / ozERC1967Proxy-UUPSUpgradeable - upgradeTo()', async() => {
                    ([ newFactoryAddr ] = await deployContract('ProxyFactory'));
                    await proxyFactory.upgradeTo(newFactoryAddr, ops);
                    impl = await proxyFactory.getImplementation();
                    assert.equal(newFactoryAddr, impl);
                    
                    const admin = await proxyFactory.getOwner();
                    assert.equal(admin, signerAddr);
                });

                it('shoud not allow an unathorized user to change the Factory implementation / ozERC1967Proxy-UUPSUpgradeable - upgradeTo()', async () => {
                    ([ newFactoryAddr ] = await deployContract('ProxyFactory'));
                    await assert.rejects(async () => {
                        await proxyFactory.connect(signers[1]).upgradeTo(newFactoryAddr, ops);
                    }, {
                        name: 'Error',
                        message: (await err(signerAddr2)).notAuthorized
                    });
                });

                it('should not allow an unauthorized user to change the owner of the factory / changeOwner()', async () => {
                    await assert.rejects(async () => {
                        await proxyFactory.connect(signers[1]).changeOwner(signerAddr2, ops);
                    }, {
                        name: 'Error',
                        message: (await err(signerAddr2)).notAuthorized
                    });
                });

                it('should allow the owner to change the owner of the factory / changeOwner()', async () => {
                    await proxyFactory.changeOwner(signerAddr2, ops);
                    const newOwner = await proxyFactory.getOwner();
                    assert.equal(newOwner, signerAddr2);

                    //Clean up
                    await proxyFactory.connect(signers[1]).changeOwner(signerAddr, ops);
                });

            });
        });

        describe('ozAccountProxy / ozPayMe', async () => {
            before(async () => {
                newProxyAddr = await createProxy(proxyFactory, accountDetails);
                newProxy = await hre.ethers.getContractAt(proxyABIeth, newProxyAddr);
            });

            describe('fallback()', async () => {
                it('should not allow re-calling / initialize()', async () => {
                    await assert.rejects(async () => {
                        await newProxy.initialize(accountDetails, nullAddr, ops);
                    }, {
                        name: 'Error',
                        message: (await err()).alreadyInitialized 
                    });
                });

                it('should not allow when not Ops calls / sendToArb()', async () => {
                    await assert.rejects(async () => {
                        await activateOzBeaconProxy(newProxyAddr);
                    }, {
                        name: 'Error',
                        message: (await err(signerAddr)).notAuthorized 
                    });
                });

                it('should allow the user to change account token / changeAccountToken()', async () => {
                    tx = await newProxy.changeAccountToken(usdcAddr);
                    receipt = await tx.wait();
                    newUserToken = getEventParam(receipt);
                    assert.equal(newUserToken, usdcAddr.toLowerCase());
                });

                it('should not allow an external user to change account token / changeAccountToken()', async () => {
                    await assert.rejects(async () => {
                        await newProxy.connect(signers[1]).changeAccountToken(usdcAddr, ops);
                    }, {
                        name: 'Error',
                        message: (await err(signerAddr2)).notAuthorized 
                    });
                });

                it('shoud not allow to change account token for the 0 address / changeAccountToken()', async () => {
                    await assert.rejects(async () => {
                        await newProxy.changeAccountToken(nullAddr, ops);
                    }, {
                        name: 'Error',
                        message: (await err()).zeroAddress
                    });
                });

                it('shoud not allow to change account token for one not found in the database / changeAccountToken()', async () => {
                    await assert.rejects(async () => {
                        await newProxy.changeAccountToken(deadAddr, ops); 
                    }, {
                        name: 'Error',
                        message: (await err(deadAddr)).tokenNotFound
                    });
                });

                it('should allow the user to change the slippage with the minimum of 0.01% / changeAccountSlippage()', async () => {
                    newUserSlippage = 0.01;

                    ([ user, token, slippage ] = await newProxy.getAccountDetails());
                    tx = await newProxy.changeAccountSlippage(parseInt(newUserSlippage * 100), ops);
                    await tx.wait();

                    ([ user, token, slippage, name ] = await newProxy.getAccountDetails());
                    assert.equal(Number(slippage) / 100, newUserSlippage); 
                });

                it('should not allow to change the slippage to 0 / changeAccountSlippage()', async () => {
                    newSlippage = 0;
                    await assert.rejects(async () => {
                        await newProxy.changeAccountSlippage(newSlippage, ops);
                    }, {
                        name: 'Error',
                        message: (await err(newSlippage)).zeroSlippage
                    });
                });

                it('should not allow an external user to change the slippage / changeAccountSlippage()', async () => {
                    await assert.rejects(async () => {
                        await newProxy.connect(signers[1]).changeAccountSlippage(200, ops);
                    }, {
                        name: 'Error',
                        message: (await err(signerAddr2)).notAuthorized
                    });
                });

                it('should change both token and slippage in one tx / changeAccountTokenNSlippage()', async () => {
                    newUserSlippage = 0.55;
                    tx = await newProxy.changeAccountTokenNSlippage(fraxAddr, parseInt(0.55 * 100), ops);
                    await tx.wait();

                    const [ user, token, slippage ] = await newProxy.getAccountDetails();
                    assert.equal(token, fraxAddr);
                    assert.equal(Number(slippage) / 100, newUserSlippage); 
                });

                it('should allow funds to be sent with correct accountDetails even if malicious data was passed / sendToArb() - delegate()', async () => {
                    opsContract = await hre.ethers.getContractAt('IOps', pokeMeOpsAddr);

                    await opsContract.connect(signers[1]).createTaskNoPrepayment(
                        newProxyAddr,
                        0x9095465e, //first 4 bytes of sendToArb(uint256,(address,address,uint256,string))
                        newProxyAddr,
                        0xcf5303cf, //first 4 bytes of checker() - 0x58e9fc59
                        ETH
                    );

                    await sendETH(newProxyAddr, 0.1);
                    receipt = await activateProxyLikeOps(newProxyAddr, signerAddr2, true, [evilVarConfig, evilUserDetails]);

                    balance = await hre.ethers.provider.getBalance(newProxyAddr);
                    assert.equal(balance.toString(), 0);

                    const areEqual = compareTopicWith(signerAddr, receipt);
                    assert(areEqual);
                });

                it('should get the account details / getAccountDetails()', async () => {
                    const [ user, token, slippage ] = await newProxy.getAccountDetails();
                    assert.equal(user, accountDetails[0]);
                    assert(token === accountDetails[1] || token === fraxAddr);
                    assert(Number(slippage) === accountDetails[2] || Number(slippage) / 100 === 0.55);
                });
            });
        });

        describe('Emitter', async () => {
            before(async () => {
                newProxyAddr = await createProxy(proxyFactory, accountDetails);
            });

            it('should emit msg.sender (account) / forwardEvent()', async () => {
                await sendETH(newProxyAddr, 0.1);
                receipt = await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr);
                showTicketSignature = '0x6901520c999a000bb546b2316af0525bc22cc86be859f5dac839762f3d40e0aa';
                doesExist = compareTopicWith2(showTicketSignature, newProxyAddr, receipt);
                assert(doesExist);
            });
    
            it('should not allow an unauhtorized user to emit ticketID / forwardEvent()', async () => {
                await assert.rejects(async () => {
                    await emitter.forwardEvent();
                }, {
                    name: 'Error',
                    message: (await err()).notProxy 
                });
            });
    
            it('should not allow to set a new Beacon / storeBeacon()', async () => {
                await assert.rejects(async () => {
                    await emitter.storeBeacon(nullAddr);
                }, {
                    name: 'Error',
                    message: (await err()).alreadyInitialized 
                });
            }); 
        });
    
        describe('StorageBeacon', async () => {
            it('should not allow an user to save an account / saveUserToDetails()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.saveUserToDetails(signerAddr2, accountDetails);
                }, {
                    name: 'Error',
                    message: (await err(1)).notAuthorized 
                });
            });

            it('should not allow an user to save a taskId / saveTaskId()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.saveTaskId(deadAddr, formatBytes32String('evil data'));
                }, {
                    name: 'Error',
                    message: (await err(1)).notAuthorized 
                });
            });

            it('should allow the owner to change changeGasPriceBid / changeGasPriceBid()', async () => {
                await storageBeacon.changeGasPriceBid(100);
            });

            it('should not allow an external user to change changeGasPriceBid / changeGasPriceBid()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.connect(signers[1]).changeGasPriceBid(100);
                }, {
                    name: 'Error',
                    message: (await err()).notOwner 
                });
            });

            it('should allow the owner to add a new token to the database / addTokenToDatabase()', async () => {
                await storageBeacon.addTokenToDatabase(wbtcAddr);
            });

            it('should not allow the onwer to add a token that is already in database / addTokenToDatabase()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.addTokenToDatabase(usdtAddrArb);
                }, {
                    name: 'Error',
                    message: (await err(usdtAddrArb)).tokenInDatabase 
                });
            });

            it('should allow the owner to add multiple tokens / addTokenToDatabase()', async () => {
                const  tokensDB_pre = await storageBeacon.getTokenDatabase();
                assert(tokensDB_pre.length > 0);

                console.log('tokens DB *******: ', tokensDB_pre);

                const tokens = [
                    mimAddr
                ];

                for (let i=0; i < tokens.length; i++) {
                    await storageBeacon.addTokenToDatabase(tokens[i]);
                }

                const tokensDB_post = await storageBeacon.getTokenDatabase();
                assert(tokensDB_post > tokensDB_pre);
            });

            it('should not allow an external user to add a new token to the database / addTokenToDatabase()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.connect(signers[1]).addTokenToDatabase(deadAddr);
                }, {
                    name: 'Error',
                    message: (await err()).notOwner 
                });
            });

            it('shoud fail when not-owner tries to remove a token in database / removeTokenFromDatabase()', async () => {
                let exist = await storageBeacon.queryTokenDatabase(usdtAddrArb);
                assert(exist);
                await assert.rejects(async () => {
                    await storageBeacon.connect(signers[1]).removeTokenFromDatabase(usdtAddrArb);
                }, {
                    name: 'Error',
                    message: (await err()).notOwner 
                });
            });

            it('should allow the owner to remove a token from database / removeTokenFromDatabase()', async () => {
                let exist = await storageBeacon.queryTokenDatabase(usdtAddrArb);
                assert(exist);

                await storageBeacon.removeTokenFromDatabase(usdtAddrArb);

                exist = await storageBeacon.queryTokenDatabase(usdtAddrArb);
                assert(!exist);
            });

            it('should fail when owner tries to remove a token not in database / removeTokenFromDatabase()', async () => {
                let exist = await storageBeacon.queryTokenDatabase(deadAddr);
                assert(!exist);

                await assert.rejects(async () => {
                    await storageBeacon.removeTokenFromDatabase(deadAddr);
                }, {
                    name: 'Error',
                    message: (await err(deadAddr)).tokenNotFound 
                });
            });

            it('should not allow re-calling / storeBeacon()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.storeBeacon(deadAddr);
                }, {
                    name: 'Error',
                    message: (await err(signerAddr)).alreadyInitialized 
                });
            });

            it('should allow the onwer to change Emergency Mode / changeEmergencyMode()', async () => {
                await storageBeacon.changeEmergencyMode(eMode);
            });

            it('should not allow an external user to change Emergency Mode / changeEmergencyMode()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.connect(signers[1]).changeEmergencyMode(eMode);
                }, {
                    name: 'Error',
                    message: (await err()).notOwner 
                });
            });

            it('should allow the owner to disable the Emitter / changeEmitterStatus()', async () => {
                accountDetails[1] = usdcAddr;
                newProxyAddr = await createProxy(proxyFactory, accountDetails);
                await storageBeacon.changeEmitterStatus(true, ops);
                await sendETH(newProxyAddr, 0.01)

                receipt = await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr);
                showTicketSignature = '0x6901520c999a000bb546b2316af0525bc22cc86be859f5dac839762f3d40e0aa';
                
                doesExist = compareTopicWith2(showTicketSignature, newProxyAddr, receipt);
                assert(!doesExist);
                await storageBeacon.changeEmitterStatus(false, ops);
            });
    
            it('should not allow an external user to disable the Emitter / changeEmitterStatus()', async () => {
                await assert.rejects(async () => {
                    await storageBeacon.connect(signers[1]).changeEmitterStatus(true);
                }, {
                    name: 'Error',
                    message: (await err()).notOwner 
                });
            });

            it('should return the accounts an user has / getAccountsByUser()', async () => {
                tokens = await storageBeacon.getTokenDatabase();
                accountDetails[1] = tokens[0];
                
                await proxyFactory.createNewProxy(accountDetails, ops);
                ([userProxies] = await storageBeacon.getAccountsByUser(signerAddr));
                assert(userProxies.length > 0);
            });

            it('should return an empty array when querying with a non-user / getAccountsByUser()', async () => {
                ([ proxies, names ] = await storageBeacon.getAccountsByUser(deadAddr));
                assert(proxies.length === 0);
            });

            it("should get an user's taskID / getTaskID()", async () => {
                tokens = await storageBeacon.getTokenDatabase();
                accountDetails[1] = tokens[0];

                await proxyFactory.createNewProxy(accountDetails, ops);
                ([userProxies] = await storageBeacon.getAccountsByUser(signerAddr));
                taskID = (await storageBeacon.getTaskID(userProxies[0])).toString();
                assert(taskID.length > 0);
            });

            it("should return a zero taskID when querying with a non-user / getTaskID()", async () => {
                taskID = (await storageBeacon.getTaskID(deadAddr)).toString();
                assert.equal(taskID, formatBytes32String(0));
            });

            it('should return true for an user / isUser()', async () => {
                tokens = await storageBeacon.getTokenDatabase();
                accountDetails[1] = tokens[0];

                await proxyFactory.createNewProxy(accountDetails, ops);
                assert(await storageBeacon.isUser(signerAddr));
            });

            it('should return false for a non-user / isUser()', async () => {
                assert(!(await storageBeacon.isUser(deadAddr)));
            });

            it('should get the Emitter status / getEmitterStatus()', async () => {
                assert(!(await storageBeacon.getEmitterStatus()));
            });

            it('should return the full token database / getTokenDatabase()', async () => {
                const tokenDb = await storageBeacon.getTokenDatabase();
                assert(tokenDb.length > 0);
            });

            it('should store the payment to the account / storeAccountPayment()', async () => {
                tokens = await storageBeacon.getTokenDatabase();
                accountDetails[1] = tokens[0];
                
                newProxyAddr = await createProxy(proxyFactory, accountDetails);

                await sendETH(newProxyAddr, 0.1);
                await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                payments = await storageBeacon.getAccountPayments(newProxyAddr);
                assert.equal(formatEther(payments), 0.1);
            });

            it('should not let an external user to store a account payment / storeAccountPayment()', async () => {                
                await assert.rejects(async () => {
                    await storageBeacon.storeAccountPayment(deadAddr, 1000);
                }, {
                    name: 'Error',
                    message: (await err()).notProxy
                });
            });

            it('should let the owner add a new authorized selector / addAuthorizedSelector()' , async () => {
                newSelector = 0xb1b3d3f6;
                isAuthorized = await storageBeacon.isSelectorAuthorized(newSelector);
                assert(!isAuthorized);
    
                tx = await storageBeacon.addAuthorizedSelector(newSelector, ops);
                await tx.wait();
    
                isAuthorized = await storageBeacon.isSelectorAuthorized(newSelector);
                assert(isAuthorized);
            });
    
            it('should not let an unauthorized user to add a new authorized selector / addAuthorizedSelector()', async () => {
                newSelector = 0x593d6819;
                isAuthorized = await storageBeacon.isSelectorAuthorized(newSelector);
                assert(!isAuthorized);
    
                await assert.rejects(async () => {
                    await storageBeacon.connect(signers[1]).addAuthorizedSelector(newSelector, ops);
                }, {
                    name: 'Error',
                    message: (await err()).notOwner 
                });
            });
        });

        describe('ozUpgradeableBeacon', async () => {
            it('should allow the owner to upgrade the Storage Beacon / upgradeStorageBeacon()', async () => {
                [storageBeaconMockAddr , storageBeaconMock] = await deployContract('StorageBeaconMock');
                await beacon.upgradeStorageBeacon(storageBeaconMockAddr);
            });

            it('should not allow an external user to upgrade the Storage Beacon / upgradeStorageBeacon()', async () => {
                [storageBeaconMockAddr , storageBeaconMock] = await deployContract('StorageBeaconMock');
                signer2 = await hre.ethers.provider.getSigner(signerAddr2);

                await assert.rejects(async () => {
                    await beacon.connect(signers[1]).upgradeStorageBeacon(storageBeaconMockAddr);
                }, {
                    name: 'Error',
                    message: (await err()).notOwner
                });
            });

            it('should allow the owner to upgrade the implementation and use with the new version of storageBeacon / upgradeTo()', async () => {
                [ storageBeaconMockAddr ] = await deployContract('StorageBeaconMock');
                await beacon.upgradeStorageBeacon(storageBeaconMockAddr, ops);
                const [ implMockAddr ] = await deployContract('ImplementationMock');
                await beacon.upgradeTo(implMockAddr);

                //execute a normal tx to the proxy and read from the new variable placed on implMock
                tokens = await storageBeacon.getTokenDatabase();
                accountDetails[1] = tokens[0];

                newProxyAddr = await createProxy(proxyFactory, accountDetails);
                
                balance = await sendETH(newProxyAddr, 1.5);
                assert(formatEther(balance) >= 1.5 && formatEther(balance) < 1.54);

                receipt = await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                balance = await hre.ethers.provider.getBalance(newProxyAddr);
                assert.equal(formatEther(balance), 0);  

                isExist = await compareEventWithVar(receipt, 11);
                assert(isExist);

                //Clean up
                USDC = await hre.ethers.getContractAt('IERC20', usdcAddr);
                balance = await USDC.balanceOf(signerAddr);
                await USDC.transfer(deadAddr, balance);
            });
        });

        describe('FakeOZL', async () => {
            it('should get the total volume in USD / getTotalVolumeInUSD', async () => {
                volume = await fakeOzl.getTotalVolumeInUSD(); 
                assert.equal(formatEther(volume), 500);
            });

            it('should get the total volume in ETH / getTotalVolumeInETH()', async () => {
                volume = await fakeOzl.getTotalVolumeInETH(); 
                assert.equal(formatEther(volume), 400);
            });

            it('should get the Assets Under Management in WETH and USD / getAUM()', async () => {
                const [ wethUM, valueUM ] = await fakeOzl.getAUM(); 
                assert.equal(formatEther(wethUM), 300);
                assert.equal(formatEther(valueUM), 200);
            });

            it('should get the OZL balance of the user / balanceOf()', async () => {
                balance = await fakeOzl.balanceOf(signerAddr2);
                assert.equal(formatEther(balance), 100);
            });

            it("should get the user's share of OZL balances in WETH and USD / getOzelBalances()", async () => {
                const [ wethUserShare, usdUserShare ] = await fakeOzl.getOzelBalances(signerAddr2);
                assert.equal(formatEther(wethUserShare), 220);
                assert.equal(formatEther(usdUserShare), 150);
            });

            it('should allow the owner to change the fake OZL vars / changeFakeOZLVars()', async () => {
                const newVars = [
                    parseEther('950'),
                    parseEther('900'),
                    parseEther('850'),
                    parseEther('800'),
                    parseEther('750'),
                    parseEther('700'),
                    parseEther('650'),
                ];
                await fakeOzl.changeFakeOZLVars(newVars);

                volume = await fakeOzl.getTotalVolumeInUSD(); 
                assert.equal(formatEther(volume), 950);

                balance = await fakeOzl.balanceOf(signerAddr2);
                assert.equal(formatEther(balance), 750);
            });

            it('allow the owner to change the receiver / changeReceiver()', async () => {
                await fakeOzl.changeReceiver(deadAddr);
                const receiver = await fakeOzl.receiver();
                assert.equal(deadAddr, receiver);
            });
        }); 
    });

    
    describe('Pesimistic deployment', async function () {

        /**
         * Deploys ozPayMeNoRedeem. which has an autoRedeem of 0, instead of ozPayme 
         */
        describe('ozAccountProxy / ozPayMe', async () => {
            before( async () => {
                ([
                    beacon, 
                    beaconAddr, 
                    ozERC1967proxyAddr, 
                    storageBeacon, 
                    storageBeaconAddr, 
                    emitter, 
                    emitterAddr, 
                    fakeOZLaddr, 
                    eMode
                ] = await deploySystem('Pessimistically', signerAddr));
        
                proxyFactory = await hre.ethers.getContractAt(factoryABI, ozERC1967proxyAddr);
                newProxyAddr = await createProxy(proxyFactory, accountDetails);
                newProxy = await hre.ethers.getContractAt(proxyABIeth, newProxyAddr);
                USDC = await hre.ethers.getContractAt('IERC20', usdcAddr);
            });

            it('should create an account successfully / createNewProxy()', async () => {
                assert.equal(newProxyAddr.length, 42);
            });

            it('should have an initial balance of 100 ETH', async () => {
                balance = await sendETH(newProxyAddr, 100);
                assert.equal(formatEther(balance), '100.0');
            });

            it('should run EmergencyMode successfully / _runEmergencyMode()', async () => {
                balance = await USDC.balanceOf(signerAddr);
                assert.equal(Number(balance), 0);

                await sendETH(newProxyAddr, 100);
                await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                balance = await USDC.balanceOf(signerAddr);
                assert(Number(balance) > 0);
            });

            it("should send the ETH back to the user as last resort / _runEmergencyMode()", async () => {
                //UserSlippage is change to 1 to produce a slippage error derived from priceMinOut calculation
                await sendETH(newProxyAddr, 100);
                await newProxy.changeAccountSlippage(1);

                preBalance = await WETH.balanceOf(signerAddr);
                assert.equal(preBalance, 0);
                await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                postBalance = await WETH.balanceOf(signerAddr);
                assert(postBalance > 0);

                //Clean up
                await WETH.transfer(deadAddr, postBalance);
            });

            it('should execute the USDC swap in the second attempt / FaultyOzPayMe - _runEmergencyMode()', async () => {
                const [ faultyOzPayMeAddr ] = await deployContract('FaultyOzPayMe');
                await beacon.upgradeTo(faultyOzPayMeAddr);
                await newProxy.changeAccountSlippage(defaultSlippage);
                
                await sendETH(newProxyAddr, 100);

                preBalance = await USDC.balanceOf(signerAddr);
                receipt = await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                postBalance = await USDC.balanceOf(signerAddr);
                assert(preBalance < postBalance);

                isExist = await compareEventWithVar(receipt, 23);
                assert(isExist);
            });

            it('should successfully execute when the ETH sent is lower than the necessary value to autoRedeem / FaultyOzPayMe() - _createTicketData()', async () => {
                const [ faultyOzPayMeAddr ] = await deployContract('FaultyOzPayMe2');
                await beacon.upgradeTo(faultyOzPayMeAddr);

                balance = await sendETH(newProxyAddr, 100);
                assert.equal(formatEther(balance), 100);

                receipt = await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                balance = await hre.ethers.provider.getBalance(newProxyAddr);
                assert.equal(formatEther(balance), 0);
            });
            
            it('should successfully submit the retryable in the 2nd attempt / FaultyOzPayMe3 - _createTicketData()', async () => {
                const [ faultyOzPayMeAddr ] = await deployContract('FaultyOzPayMe3');
                await beacon.upgradeTo(faultyOzPayMeAddr);

                balance = await sendETH(newProxyAddr, 100);
                assert.equal(formatEther(balance), 100);

                receipt = await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                balance = await hre.ethers.provider.getBalance(newProxyAddr);
                assert.equal(formatEther(balance), 0);

                isExist = await compareEventWithVar(receipt, 23);
                assert(isExist);
            });
        });

        describe('ETH withdrawal as last resort', async function () {

            /**
             * Deploys FaultyProxyFactory which creates FaultyOzBeaconProxy that doesn't
             * have a delegate() function for proxy forwarding.
             */
            before( async () => {
                ([
                    beacon, 
                    beaconAddr, 
                    ozERC1967proxyAddr, 
                    storageBeacon, 
                    storageBeaconAddr, 
                    emitter, 
                    emitterAddr, 
                    fakeOZLaddr, 
                    eMode
                ] = await deploySystem('Pessimistically_v2', signerAddr));
        
                proxyFactory = await hre.ethers.getContractAt(factoryABI, ozERC1967proxyAddr);
                newProxyAddr = await createProxy(proxyFactory, accountDetails);
                newProxy = await hre.ethers.getContractAt(proxyABIeth, newProxyAddr);
                USDC = await hre.ethers.getContractAt('IERC20', usdcAddr);
            });
    
            beforeEach(async () => {
                balance = await sendETH(newProxyAddr, 100);
                assert(formatEther(balance) === '100.0' || formatEther(balance) === '200.0');
            });
    
            it('should not send to Arbitrum an ETH transfer made to the account / lack of delegate()', async () => {
                await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
                balance = await hre.ethers.provider.getBalance(newProxyAddr);
                assert.equal(formatEther(balance), '100.0');
            });
    
            it('should let the user withdraw the ETH stuck on their account / withdrawETH_lastResort()', async () => {
                preBalance = await hre.ethers.provider.getBalance(signerAddr);
                await newProxy.withdrawETH_lastResort(ops);
                postBalance = await hre.ethers.provider.getBalance(signerAddr);
                assert(formatEther(postBalance) > formatEther(preBalance));
            });
    
            it('should not let user B to withdraw the stuck ETH of user A / withdrawETH_lastResort()', async () => {
                await assert.rejects(async () => {
                    await newProxy.connect(signers[1]).withdrawETH_lastResort(ops);
                }, {
                    name: 'Error',
                    message: (await err(signerAddr2)).notAuthorized
                });
            });
        });
    });
  });