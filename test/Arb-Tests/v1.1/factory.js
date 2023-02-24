const { ethers } = require("ethers");
const assert = require('assert');
const {
    parseEther, 
    formatEther, 
    hexStripZeros 
} = ethers.utils;

const { err } = require('../../errors'); 

const { 
    balanceOfOZL, 
    transferOZL, 
    withdrawShareOZL, 
    getVarsForHelpers,
    enableWithdrawals,
    deploy,
    getOzelIndex,
    addTokenToDatabase,
    getRegulatorCounter,
    getTestingNumber,
    replaceForModVersion,
    queryTokenDatabase,
    removeTokenFromDatabase,
    getAccData,
    sendETHWithAlias,
    deployFacet,
    activateProxyLikeOpsL2,
    getInitSelectors
} = require('../../../scripts/helpers-arb');

const { getSelectors } = require('../../../scripts/myDiamondUtil');
const { 
    createProxy, 
    sendETH,
    activateOzBeaconProxy
} = require('../../../scripts/helpers-eth');

const { 
    usdtAddrArb,
    defaultSlippage,
    nullAddr,
    deadAddr,
    crvTricrypto,
    diamondABI,
    usxAddr,
    dForcePoolAddr,
    ops,
    protocolFee,
    tokensDatabaseL1,
    usdcAddr,
    crv2PoolAddr,
    pokeMeOpsAddr,
    accountL2ABI,
    fraxAddr,
    wbtcAddr
} = require('../../../scripts/state-vars');

const { MaxUint256 } = ethers.constants;


let ozlDiamondAddr, ozlDiamond, newProxyAddr, ozMiddle;
let ownerAddr, signer, signerAddr;
let tx, receipt, balance, accData;
let usersProxies = [];
let signers, signerAddr2, beacon;
let facetCut, accounts, names;

describe('v1.1 tests', async function () {
    this.timeout(1000000);

    // before(async () => {
        // ([ signer ] = await hre.ethers.getSigners());
        // signerAddr = await signer.getAddress();

        // accountDetails = [
        //     signerAddr,
        //     usdtAddrArb,
        //     defaultSlippage,
        //     'test'
        // ];

    //     ownerAddr = '0xe738696676571D9b74C81716E4aE797c2440d306';
    //     ozlDiamondAddr = '0x7D1f13Dd05E6b0673DC3D0BFa14d40A74Cfa3EF2';
    //     ozlFacet = '0x3164a03cDbbf607Db19a366416113f7f74341B56';
    //     ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);

    //     //Deploys the ProxyFactory in L2
    //     const Factory = await hre.ethers.getContractFactory('ozProxyFactoryFacet');
    //     const factory = await Factory.deploy(pokeMeOpsAddr);
    //     await factory.deployed();
    //     console.log('ozProxyFactoryFacet deployed to: ', factory.address);

    //     //Deploys ozLoupeFacetV1_1 in L2
    //     const newLoupe = await deployFacet('ozLoupeFacetV1_1');

    //     //Adds them to ozDiamond
    //     ops.value = parseEther('3');
    //     ops.to = ownerAddr;
    //     await signer.sendTransaction(ops);
    //     delete ops.value;
    //     delete ops.to;

    //     await hre.network.provider.request({
    //         method: "hardhat_impersonateAccount",
    //         params: [ownerAddr],
    //     });
    
    //     const ownerSigner = await hre.ethers.provider.getSigner(ownerAddr);
    //     const facetCut = [
    //         [ factory.address, 0, getSelectors(factory) ],
    //         [ newLoupe.address, 0, getSelectors(newLoupe) ]
    //     ];
    //     await ozlDiamond.connect(ownerSigner).diamondCut(facetCut, nullAddr, '0x');

    //     await hre.network.provider.request({
    //         method: "hardhat_stopImpersonatingAccount",
    //         params: [ownerAddr],
    //     });

    //     getVarsForHelpers(ozlDiamond, ozlFacet);

    // });

    before(async () => {
        const deployedVars = await deploy();
        ({
            deployedDiamond, 
            WETH,
            USDT,
            WBTC,
            USDC,
            MIM,
            FRAX,
            crvTri,
            callerAddr, 
            caller2Addr,
            ozlFacet,
            yvCrvTri
        } = deployedVars);
    
        getVarsForHelpers(deployedDiamond, ozlFacet);
        ozlDiamond = await hre.ethers.getContractAt(diamondABI, deployedDiamond.address);

        signers = await hre.ethers.getSigners();
        ([ signer ] = await hre.ethers.getSigners());
        ([signerAddr, signerAddr2 ] = await hre.ethers.provider.listAccounts());

        accountDetails = [
            signerAddr,
            usdtAddrArb,
            defaultSlippage,
            'test'
        ];

        accData = getAccData(callerAddr, usdtAddrArb, defaultSlippage);

        //----------
        //Deploys ozMiddleware
        const OzMiddle = await hre.ethers.getContractFactory('ozMiddlewareL2');
        ozMiddle = await OzMiddle.deploy(deployedDiamond.address);
        await ozMiddle.deployed();
        console.log('ozMiddlewareL2 deployed to: ', ozMiddle.address);

        //Deploys ozUpgradeableBeaconL2
        const Beacon = await hre.ethers.getContractFactory('UpgradeableBeacon');
        beacon = await Beacon.deploy(ozMiddle.address);
        await beacon.deployed();
        console.log('ozUpgradeableBeacon in L2 deployed to: ', beacon.address);

        //Deploys the ProxyFactory in L2
        const Factory = await hre.ethers.getContractFactory('ozProxyFactoryFacet');
        const factory = await Factory.deploy(pokeMeOpsAddr, beacon.address);
        await factory.deployed();
        console.log('ozProxyFactoryFacet deployed to: ', factory.address);

        //Deploys ozLoupeFacetV1_1 in L2
        const newLoupe = await deployFacet('ozLoupeFacetV1_1');

        //Deploys the init upgrade
        const Init = await hre.ethers.getContractFactory('InitUpgradeV1_1');
        const init = await Init.deploy();
        await init.deployed();
        console.log('InitUpgradeV1_1 deployed to: ', init.address);

        const functionCall = init.interface.encodeFunctionData('init', [getInitSelectors()]);

        //Adds factory and loupeV1.1 to ozDiamond
        facetCut = [
            [ factory.address, 0, getSelectors(factory) ],
            [ newLoupe.address, 0, getSelectors(newLoupe) ]
        ];
        await ozlDiamond.diamondCut(facetCut, init.address, functionCall);

        //Set authorized caller
        const undoAliasAddrOzMiddleL2 = '0x73d974d481ee0a5332c457a4d796187f6ba66eda';
        await ozlDiamond.setAuthorizedCaller(undoAliasAddrOzMiddleL2, true);

    });

    describe('ozProxyFactoryFacet', async () => {
        describe('Deploys one account', async () => {
            it('should create a account successfully / createNewProxy()', async () => {
                await ozlDiamond.createNewProxy(accountDetails, ops);
                ([ proxies, names ] = await ozlDiamond.getAccountsByUser(signerAddr));

                newProxyAddr = proxies[0].toString(); 
                const name = names[0].toString();
                assert.equal(newProxyAddr.length, 42);
                assert(name.length > 0);
            });

            it('should not allow to create a account witn an empty account name / createNewProxy()', async () => {
                accountDetails[3] = '';
                await assert.rejects(async () => {
                    await ozlDiamond.createNewProxy(accountDetails, ops);
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
                    await ozlDiamond.createNewProxy(accountDetails, ops);
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
                    await ozlDiamond.createNewProxy(accountDetails, ops);
                }, {
                    name: 'Error',
                    message: (await err()).zeroAddress 
                });
            });

            it('should not allow to create a account with 0 slippage / createNewProxy()', async () => {
                accountDetails[1] = usdtAddrArb;
                accountDetails[2] = 0;
                await assert.rejects(async () => {
                    await ozlDiamond.createNewProxy(accountDetails, ops);
                }, {
                    name: 'Error',
                    message: (await err()).zeroSlippage
                });
            });

            it('should not allow to create an account with an slippage of more than 5% / createNewProxy()', async () => {
                accountDetails[2] = 501;
                await assert.rejects(async () => {
                    await ozlDiamond.createNewProxy(accountDetails, ops);
                }, {
                    name: 'Error',
                    message: (await err()).zeroSlippage
                });
            });

            it('should not allow to create a account with a token not found in the database / createNewProxy()', async () => {
                accountDetails[1] = deadAddr;
                accountDetails[2] = defaultSlippage;
                await assert.rejects(async () => {
                    await ozlDiamond.createNewProxy(accountDetails, ops);
                }, {
                    name: 'Error',
                    message: (await err(deadAddr)).tokenNotFound
                });
            })

            it('should not allow an external user to add an authorized selector / authorizeSelector()', async () => {
                await assert.rejects(async () => {
                    await ozlDiamond.connect(signers[1]).authorizeSelector('0xffffffff', true, ops);
                }, {
                    name: 'Error',
                    message: (await err(2)).notAuthorized
                });
            });

            it('should allow the owner to add an authorized selector / authorizeSelector()', async () => {
                await ozlDiamond.authorizeSelector('0xffffffff', true, ops);
            });

            it('should have an initial balance of 0.1 ETH', async () => { 
                accountDetails[1] = usdtAddrArb;
                newProxyAddr = await createProxy(ozlDiamond, accountDetails);

                balance = await hre.ethers.provider.getBalance(newProxyAddr);
                if (Number(balance) === 0) await sendETH(newProxyAddr, 0.1);

                balance = await hre.ethers.provider.getBalance(newProxyAddr);
                assert.equal(formatEther(balance), '0.1');
            });

            it('should have a final balance of 0 ETH', async () => {
                newProxyAddr = await createProxy(ozlDiamond, accountDetails);
                balance = await hre.ethers.provider.getBalance(newProxyAddr);
                if (Number(balance) === 0) await sendETH(newProxyAddr, 0.1);
                
                await activateProxyLikeOpsL2(newProxyAddr, ozlDiamond.address, accData);
                balance = await hre.ethers.provider.getBalance(newProxyAddr);
                assert.equal(formatEther(balance), 0);
            });
        });

        describe('Deploys 5 accounts', async () => { 
            before(async () => {
                accountDetails[1] = usdcAddr;
                for (let i=0; i < 5; i++) {
                    accountDetails[3] = `my account #${i}`;
                    newProxyAddr = await createProxy(ozlDiamond, accountDetails);

                    usersProxies.push(newProxyAddr);
                    assert.equal(newProxyAddr.length, 42);
                }
                ([ proxies, names ] = await ozlDiamond.getAccountsByUser(signerAddr));
            });

            it('deploys 5 accounts with an initial balance of 100 ETH each and a final balace of 0 / createNewProxy()', async () => {
                for (let i=0; i < proxies.length; i++) {
                    balance = await sendETH(proxies[i], 100);
                    assert(formatEther(balance) === '100.0' || formatEther(balance) === '100.1');

                    await activateProxyLikeOpsL2(proxies[i], ozlDiamond.address, accData);
                    balance = await hre.ethers.provider.getBalance(proxies[i]);
                    assert.equal(formatEther(balance), 0);
                }
            });
        });

        describe('Upgrade the factory', async () => {
            it('should upgrade the factory', async () => {
                const NewFactory = await hre.ethers.getContractFactory('ozProxyFactoryFacet');
                const newFactory = await NewFactory.deploy(pokeMeOpsAddr, beacon.address);
                await newFactory.deployed();
                console.log('New ProxyFactoryL2 deployed to: ', newFactory.address);

                facetCut = [ [ newFactory.address, 1, getSelectors(newFactory) ] ];
                tx = await ozlDiamond.diamondCut(facetCut, nullAddr, '0x');
                await tx.wait();

                const facets = await ozlDiamond.facetAddresses();
                for (let i=0; i < facets.length; i++) {
                    if (facets[i] === newFactory.address) {
                        assert(true);
                        return;
                    }
                }
                assert(false);
            });
        });
    });

    describe('ozAccountProxyL2', async () => {
        before(async () => {
            newProxyAddr = await createProxy(ozlDiamond, accountDetails);
            newProxy = await hre.ethers.getContractAt(accountL2ABI, newProxyAddr);
        });

        it('should not allow re-calling / initialize()', async () => {
            accData = getAccData(callerAddr, usdtAddrArb, defaultSlippage);
            await assert.rejects(async () => {
                await newProxy.initialize(accData, ops);
            }, {
                name: 'Error',
                message: (await err()).alreadyInitialized 
            });
        });

        it('should not allow when an entity that is not Ops makes the call / _delegate()', async () => {
            await assert.rejects(async () => {
                await activateOzBeaconProxy(newProxyAddr);
            }, {
                name: 'Error',
                message: (await err(signerAddr)).notAuthorized 
            });
        });
    });

    describe('ozMiddlewareL2', async () => {
        before(async () => {
            newProxyAddr = await createProxy(ozlDiamond, accountDetails);
            newProxy = await hre.ethers.getContractAt(accountL2ABI, newProxyAddr);
        });

        it('should not let a non-account user to call the function / exchangeToAccountToken()', async () => {
            await assert.rejects(async () => {
                await ozMiddle.exchangeToAccountToken(
                    accData,
                    MaxUint256,
                    deadAddr
                );
            }, {
                name: 'Error',
                message: (await err()).notAccount 
            });
        }) 

        it('should not allow an external user to change account token / changeToken()', async () => {
            await assert.rejects(async () => {
                await newProxy.connect(signers[1]).changeToken(usdcAddr, ops);
            }, {
                name: 'Error',
                message: (await err(signerAddr2)).notAuthorized 
            });
        });

        it('shoud not allow to change account token for the 0 address / changeToken()', async () => {
            await assert.rejects(async () => {
                await newProxy.changeToken(nullAddr, ops);
            }, {
                name: 'Error',
                message: (await err()).zeroAddress
            });
        });

        it('shoud not allow to change account token for one not found in the database / changeToken()', async () => {
            await assert.rejects(async () => {
                await newProxy.changeToken(deadAddr, ops); 
            }, {
                name: 'Error',
                message: (await err(deadAddr)).tokenNotFound
            });
        });

        it('should allow the user to change the slippage with the minimum of 0.01% / changeSlippage()', async () => {
            newUserSlippage = 0.01; 

            tx = await newProxy.changeSlippage(parseInt(newUserSlippage * 100), ops);
            await tx.wait();

            ([ user, token, slippage ] = await newProxy.getDetails());

            assert.equal(Number(slippage) / 100, newUserSlippage); 
        });

        it('should not allow to change the slippage to 0 / changeSlippage()', async () => {
            newSlippage = 0;
            await assert.rejects(async () => {
                await newProxy.changeSlippage(newSlippage, ops);
            }, {
                name: 'Error',
                message: (await err(newSlippage)).zeroSlippage
            });
        });

        it('should not allow to change the slippage to more than 5% / changeSlippage()', async () => {
            newSlippage = 501;
            await assert.rejects(async () => {
                await newProxy.changeSlippage(newSlippage, ops);
            }, {
                name: 'Error',
                message: (await err(newSlippage)).zeroSlippage
            });
        });

        it('should not allow an external user to change the slippage / changeSlippage()', async () => {
            await assert.rejects(async () => {
                await newProxy.connect(signers[1]).changeSlippage(200, ops);
            }, {
                name: 'Error',
                message: (await err(signerAddr2)).notAuthorized
            });
        });

        it('should change both token and slippage in one tx / changeTokenNSlippage()', async () => {
            newUserSlippage = 0.55;
            tx = await newProxy.changeTokenNSlippage(fraxAddr, parseInt(0.55 * 100), ops);
            await tx.wait();

            const [ user, token, slippage ] = await newProxy.getDetails();
            assert.equal(token, fraxAddr);
            assert.equal(Number(slippage) / 100, newUserSlippage); 
        });

        describe('withdrawETH_lastResort', async () => {
            before(async () => {
                newProxyAddr = await createProxy(ozlDiamond, accountDetails);
                newProxy = await hre.ethers.getContractAt(accountL2ABI, newProxyAddr);
    
                balance = await sendETH(newProxyAddr, 100);
                assert(formatEther(balance) === '100.0' || formatEther(balance) === '200.0');
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

    describe('ozLoupeFacetV1_1', async () => {
        before(async () => {
            accountDetails[0] = signerAddr2;
            for (let i=0; i < 3; i++) {
                await createProxy(ozlDiamond, accountDetails);
            }
        });

        it('should get all the Accounts created by the user / getAccountsByUser()', async () => {
            ([ accounts, names ] = await ozlDiamond.getAccountsByUser(signerAddr2));
            
            for (let i=0; i < accounts.length; i++) {
                if (accounts[i] === nullAddr) assert(false);
            }
            assert.equal(accounts.length, 3);
            assert.equal(names.length, 3)
        });

        it("should get all the Gelato task IDs, one for each Account / getTaskID()", async () => {
            ([ accounts, names ] = await ozlDiamond.getAccountsByUser(signerAddr2));
            let taskId;
            const nullBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
            const tasks = [];

            for (let i=0; i < accounts.length; i++) {
                taskId = await ozlDiamond.getTaskID(accounts[i], signerAddr2);
                if (taskId === nullBytes32) assert(false);
                tasks.push(taskId);
            }
            assert.equal(tasks.length, 3);
        });
    });

    /**
     * This test is meant to be ran as one.
     */
    describe('OZL balance', async () => {
        before(async () => {
            accountDetails[0] = signerAddr;
            newProxyAddr = await createProxy(ozlDiamond, accountDetails);
        });

        it('should correctly calculate OZL balance for an user when using an L2 Account', async () => {
            balance = await hre.ethers.provider.getBalance(newProxyAddr);
            if (Number(balance) === 0) await sendETH(newProxyAddr, 0.1);
            
            await activateProxyLikeOpsL2(newProxyAddr, ozlDiamond.address, accData);
            balance = await hre.ethers.provider.getBalance(newProxyAddr);
            assert.equal(formatEther(balance), 0);

            balance = await ozlDiamond.balanceOf(signerAddr);
            assert(formatEther(balance) > 99.99 && formatEther(balance) <= 100);
        });

        it('should convert ETH to token (WBTC) and properly calculate OZL balances', async () => {
            accountDetails[0] = signerAddr2;
            accountDetails[1] = wbtcAddr;
            newProxyAddr = await createProxy(ozlDiamond, accountDetails);
            accData = getAccData(signerAddr2, wbtcAddr, defaultSlippage);

            balance = await hre.ethers.provider.getBalance(newProxyAddr);
            if (Number(balance) === 0) await sendETH(newProxyAddr, 0.1);
            balance = await hre.ethers.provider.getBalance(newProxyAddr);
            assert.equal(formatEther(balance), 0.1);

            await activateProxyLikeOpsL2(newProxyAddr, ozlDiamond.address, accData);
            balance = await hre.ethers.provider.getBalance(newProxyAddr);
            assert.equal(formatEther(balance), 0);

            assert(formatEther(await WBTC.balanceOf(signerAddr2)) > 0);

            const balanceUser1 = await ozlDiamond.balanceOf(signerAddr);
            const balanceUser2 = await ozlDiamond.balanceOf(signerAddr2);
            assert.equal(formatEther(balanceUser1), 50.0);
            assert.equal(formatEther(balanceUser2), 50.0);
        });
    });

});