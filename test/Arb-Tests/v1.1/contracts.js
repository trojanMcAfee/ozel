const { ethers } = require("ethers");
const assert = require('assert');
const { formatEther } = ethers.utils;

const { err } = require('../../errors'); 

const { 
    getVarsForHelpers,
    deploy,
    getAccData,
    activateProxyLikeOpsL2,
    deployV1_1
} = require('../../../scripts/helpers-arb');

const { getSelectors } = require('../../../scripts/myDiamondUtil');

const { 
    createProxy, 
    sendETH,
    activateOzBeaconProxy,
    deployContract
} = require('../../../scripts/helpers-eth');

const { 
    usdtAddrArb,
    defaultSlippage,
    nullAddr,
    deadAddr,
    diamondABI,
    ops,
    usdcAddr,
    pokeMeOpsAddr,
    accountL2ABI,
    fraxAddr
} = require('../../../scripts/state-vars');const { parseEther } = require("ethers/lib/utils");
;

const { MaxUint256 } = ethers.constants;


let ozlDiamond, newProxyAddr;
let signer, signerAddr, signerAddr2, signerAddr3;
let tx, balance, accData;
let usersProxies = [];
let signers, beacon, ozMiddleware;
let facetCut, accounts, names;
let constrArgs, USDT, USDC, balanceETH, FRAX, balanceFRAX;

describe('Contracts tests', async function () {
    this.timeout(1000000);

    before(async () => {
        /**
         * Deploys v1
         */
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

        /**
         * Deploys V1.1
         */
        ([ ozMiddleware, beacon ] = await deployV1_1(ozlDiamond));
    
        /**
         * Rest of configuration
         */
        signers = await hre.ethers.getSigners();
        signer = signers[0];
        ([signerAddr, signerAddr2, signerAddr3 ] = await hre.ethers.provider.listAccounts());

        accData = getAccData(callerAddr, usdtAddrArb, defaultSlippage);

        accountDetails = [
            signerAddr,
            usdtAddrArb,
            defaultSlippage,
            'test'
        ];

        const undoAliasAddrOzMiddleL2 = '0x3b4759f0f772848b2d91f1d83e2fe57935346f18';
        tx = await ozlDiamond.setAuthorizedCaller(undoAliasAddrOzMiddleL2, true);
        await tx.wait();

        /**
         * ERC20s
         */
        USDT = await hre.ethers.getContractAt('IERC20', usdtAddrArb);
        USDC = await hre.ethers.getContractAt('IERC20', usdcAddr);
        FRAX = await hre.ethers.getContractAt('IERC20', fraxAddr);
    });

    describe('ozProxyFactoryFacet', async () => {
        describe('Deploys one account', async () => {
            it('should create a account successfully / createNewProxy()', async () => {
                tx = await ozlDiamond.createNewProxy(accountDetails, ops);
                await tx.wait();
                ([ proxies, names ] = await ozlDiamond.getAccountsByUser(signerAddr));

                newProxyAddr = proxies[0].toString(); 
                const name = names[0].toString();
                assert.equal(newProxyAddr.length, 42);
                assert(name.length > 0);
            });

            it('should not allow to create a account witn an empty account name / createNewProxy()', async () => {
                accountDetails[3] = '';
                await assert.rejects(async () => {
                    tx = await ozlDiamond.createNewProxy(accountDetails, ops);
                    await tx.wait();
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
                tx = await ozlDiamond.authorizeSelector('0xffffffff', true, ops);
                await tx.wait();
            });

            it('should have a final of 0 ETH and 1600+ USDT after an 0.1 ETH transfer', async () => { 
                accountDetails[1] = usdtAddrArb;
                newProxyAddr = await createProxy(ozlDiamond, accountDetails);

                balance = await USDT.balanceOf(signerAddr);
                assert.equal(balance / 10 ** 6, 0);

                balance = await hre.ethers.provider.getBalance(newProxyAddr);
                if (Number(balance) === 0) await sendETH(newProxyAddr, 0.1);

                balance = await USDT.balanceOf(signerAddr);
                assert(balance / 10 ** 6 > 0);

                balance = await hre.ethers.provider.getBalance(newProxyAddr);
                assert.equal(formatEther(balance), 0);
            });
        });

        describe('Deploys 5 accounts', async () => { 
            before(async () => {
                accountDetails[0] = signerAddr2;
                accountDetails[1] = usdcAddr;
                for (let i=0; i < 5; i++) {
                    accountDetails[3] = `my account #${i}`;
                    newProxyAddr = await createProxy(ozlDiamond, accountDetails);

                    usersProxies.push(newProxyAddr);
                    assert.equal(newProxyAddr.length, 42);
                }
                ([ proxies, names ] = await ozlDiamond.getAccountsByUser(signerAddr2));
            });

            it('deploys 5 accounts with an initial balance of 100 ETH each, a final balance of 0 ETH and 150k USDC per iteration / createNewProxy()', async () => {
                let oldBalance = 0;
                let newBalance = 0;

                for (let i=0; i < proxies.length; i++) {
                    await sendETH(proxies[i], 100);
                    newBalance = (await USDC.balanceOf(signerAddr2)) / 10 ** 6;
                    assert(newBalance > oldBalance);
                    oldBalance = newBalance;

                    balanceETH = await hre.ethers.provider.getBalance(proxies[i]);
                    assert.equal(formatEther(balanceETH), 0);
                }
            });
        });

        describe('Upgrade the factory', async () => {
            it('should upgrade the factory', async () => {
                constrArgs = [beacon.address];
                const [ newFactoryAddr, newFactory ] = await deployContract('ozProxyFactoryFacet', constrArgs);

                facetCut = [ [ newFactoryAddr, 1, getSelectors(newFactory) ] ];
                tx = await ozlDiamond.diamondCut(facetCut, nullAddr, '0x');
                await tx.wait();

                const facets = await ozlDiamond.facetAddresses();
                for (let i=0; i < facets.length; i++) {
                    if (facets[i] === newFactoryAddr) {
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
            accountDetails[0] = signerAddr;
            accountDetails[1] = fraxAddr;
            newProxyAddr = await createProxy(ozlDiamond, accountDetails);
            newProxy = await hre.ethers.getContractAt(accountL2ABI, newProxyAddr);
        });

        it('should not allow re-calling / initialize()', async () => {
            accData = getAccData(callerAddr, fraxAddr, defaultSlippage);
            await assert.rejects(async () => {
                tx = await newProxy.initialize(accData, ops);
                await tx.wait();
            }, {
                name: 'Error',
                message: (await err()).alreadyInitialized 
            });
        });

        it('should run successfully even if it is called with evil data / _delegate()', async () => {
            const iface = new ethers.utils.Interface(diamondABI);
            const value = parseEther('1');
            const evilData = iface.encodeFunctionData('exchangeToAccountToken', [
                '0x',
                value,
                deadAddr
            ]);

            balanceFRAX = await FRAX.balanceOf(signerAddr);
            assert.equal(formatEther(balanceFRAX), 0);

            tx = await signer.sendTransaction({
                to: newProxyAddr,
                value,
                data: evilData
            });
            await tx.wait();

            balanceETH = await hre.ethers.provider.getBalance(newProxyAddr);
            assert.equal(formatEther(balanceETH), 0);

            balanceFRAX = await FRAX.balanceOf(signerAddr);
            assert(formatEther(balanceFRAX) > 0);
        });
    });

    describe('ozMiddlewareL2', async () => {
        before(async () => {
            accountDetails[0] = signerAddr;
            newProxyAddr = await createProxy(ozlDiamond, accountDetails);
            newProxy = await hre.ethers.getContractAt(accountL2ABI, newProxyAddr);
        });

        describe('Account methods', async () => {
            it('should not let an external user to call the function / exchangeToAccountToken()', async () => {
                await assert.rejects(async () => {
                    await ozMiddleware.exchangeToAccountToken(
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
        });

        describe('withdrawETH_lastResort', async () => {
            before(async () => {
                constrArgs = [beacon.address];
                const [ newFactoryAddr, newFactory ] = await deployContract('ozProxyFactoryTest', constrArgs);

                facetCut = [ [ newFactoryAddr, 1, getSelectors(newFactory) ] ];
                tx = await ozlDiamond.diamondCut(facetCut, nullAddr, '0x');
                await tx.wait();

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
            assert(accounts.length === 3 || accounts.length === 8);
            assert(names.length === 3 || names.length === 8);
        });
    });

    describe('UpgradeableBeacon', async () => {
        it('should let the owner upgrade the beacon', async () => {
            ([ newMiddlewareAddr, newMiddleware ] = await deployContract('ozMiddlewareL2', [ ozlDiamond.address ]));
            tx = await beacon.upgradeTo(newMiddlewareAddr);
            await tx.wait();

            const impl = await beacon.implementation();
            assert.equal(impl, newMiddlewareAddr);
        });

        it('should not let an external user upgrade the beacon', async () => {
            ([ newMiddlewareAddr, newMiddleware ] = await deployContract('ozMiddlewareL2', [ ozlDiamond.address ]));
            
            await assert.rejects(async () => {
                tx = await beacon.connect(signers[1]).upgradeTo(newMiddlewareAddr);
            }, {
                name: 'Error',
                message: (await err()).notOwner 
            });
        });
    });
});