const { ethers } = require("ethers");
const assert = require('assert');
const { parseEther, formatEther } = ethers.utils;
require('dotenv').config();

const { err } = require('../errors.js');

const {
    balanceOfOZL, 
    withdrawShareOZL, 
    getVarsForHelpers,
    sendETH,
    enableWithdrawals,
    deploy,
    addTokenToDatabase,
    queryTokenDatabase,
    removeTokenFromDatabase,
    getAccData
} = require('../../scripts/helpers-arb.js');

const { 
    usdtAddrArb,
    defaultSlippage,
    nullAddr,
    deadAddr,
    diamondABI,
    usxAddr,
    dForcePoolAddr,
    ops,
    protocolFee,
    tokensDatabaseL1,
    usdcAddr,
    crv2PoolAddr
} = require('../../scripts/state-vars.js');



let accountDetails;
let callerAddr, caller2Addr;
let deployedDiamond, ozlDiamond;
let evilAmount, evilSwapDetails;
let tokenSwap, token;
let addFlag, totalVolume;
let signer1, signer2;


/**
 * Specific unit-tests for certain functions within Arbitrum contracts.
 */
describe('Unit testing', async function () {
    this.timeout(1000000);

    before( async () => {
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
            yvCrvTri,
            USX
        } = deployedVars);
    
        ([ signer1, signer2 ] = await hre.ethers.getSigners());
        
        getVarsForHelpers(deployedDiamond, ozlFacet);
        accountDetails = getAccData(callerAddr, tokensDatabaseL1.fraxAddr, defaultSlippage);

        ozlDiamond = await hre.ethers.getContractAt(diamondABI, deployedDiamond.address);
        await ozlDiamond.setAuthorizedCaller(callerAddr, true, ops);
        evilAmount = parseEther('1000');
    });

    xdescribe('OZLFacet', async () => {
        describe('exchangeToAccountToken()', async () => {
            it('should get in accountPayments the exact amount of ETH sent to the account', async () => {
                await sendETH(accountDetails);
                const payments = await ozlDiamond.getAccountPayments(deadAddr);
                assert.equal(formatEther(payments), 10);
            });

            it('should fail with user as address(0)', async () => {
                accountDetails = getAccData(nullAddr, tokensDatabaseL1.fraxAddr, defaultSlippage);
                await assert.rejects(async () => {
                    await sendETH(accountDetails);
                }, {
                    name: 'Error',
                    message: (await err()).zeroAddress 
                });
            });
    
            it('should fail with account token as address(0)', async () => {
                accountDetails = getAccData(callerAddr, nullAddr, defaultSlippage);
                await assert.rejects(async () => {
                    await sendETH(accountDetails);
                }, {
                    name: 'Error',
                    message: (await err()).zeroAddress 
                });
            });
    
            it('should fail with slippage as 0', async () => {
                accountDetails = getAccData(callerAddr, tokensDatabaseL1.fraxAddr, 0);
                await assert.rejects(async () => {
                    await sendETH(accountDetails);
                }, {
                    name: 'Error',
                    message: (await err()).zeroSlippage 
                });
            });
    
            it('should fail when account token is not in database', async () => {
                accountDetails = getAccData(callerAddr, deadAddr, defaultSlippage);
                await assert.rejects(async () => {
                    await sendETH(accountDetails);
                }, {
                    name: 'Error',
                    message: (await err(deadAddr)).tokenNotFound 
                });
            });
    
            it('should fail when msg.value is equal to 0', async () => {
                accountDetails = getAccData(callerAddr, tokensDatabaseL1.usdcAddr, defaultSlippage);
                await assert.rejects(async () => {
                    await sendETH(accountDetails, 'no value');
                }, {
                    name: 'Error',
                    message: (await err()).zeroMsgValue 
                });
            });

            it('should not allow a swap in normal condition with the l1Check disabled / exchangeToAccountToken() - changeL1Check()', async () => {
                accountDetails = getAccData(callerAddr, tokensDatabaseL1.usdcAddr, defaultSlippage);
                await ozlDiamond.changeL1Check(false);
                ops.value = parseEther('1');

                await assert.rejects(async () => {
                    await ozlDiamond.exchangeToAccountToken(accountDetails, parseEther('1'), deadAddr, ops);
                }, {
                    name: 'Error',
                    message: (await err(tokensDatabaseL1.usdcAddr)).tokenNotFound 
                });

                //Clean up
                await ozlDiamond.changeL1Check(true);
            });

            /**
             * This is test is for bridging is eliminated from the system, so the token checks are done exclusively for L2 addresses
             */
            it('should allow a swap after disabling the l1Check and only adding an l2Address (without l1Address) / exchangeToAccountToken() - changeL1Check()', async () => {
                tokenSwap = [
                    1,
                    0,
                    usdtAddrArb,
                    usdcAddr,
                    crv2PoolAddr
                ];
                token = [ tokensDatabaseL1.usdcAddr, usdcAddr ];
                await removeTokenFromDatabase(tokenSwap, token);

                token[0] = nullAddr;
                await addTokenToDatabase(tokenSwap, token);
                await ozlDiamond.changeL1Check(false);

                accountDetails = getAccData(callerAddr, usdcAddr, defaultSlippage);
                ops.value = parseEther('1');
                await ozlDiamond.exchangeToAccountToken(accountDetails, parseEther('1'), deadAddr, ops);

                //Clean up
                await ozlDiamond.changeL1Check(true);
                await removeTokenFromDatabase(tokenSwap, token);
                token[0] = tokensDatabaseL1.usdcAddr;
                await addTokenToDatabase(tokenSwap, token);
            });

            it('shoud not allow an authorized user to call the function through ozDiamond / exchangeToAccountToken()', async () => {
                data = getAccData(callerAddr, tokensDatabaseL1.fraxAddr, defaultSlippage);
                amount = parseEther('1');
                ops.value = amount;
                const [ signer1, signer2 ] = await hre.ethers.getSigners();

                await assert.rejects(async () => {
                    await ozlDiamond.connect(signer2).exchangeToAccountToken(data, amount, deadAddr, ops);
                }, {
                    name: 'Error',
                    message: (await err(caller2Addr)).notAuthorized 
                });

                //Clean up
                if (ops.value) delete ops.value;
            });
        });

        describe('withdrawUserShare()', async () => {
            beforeEach(async () => await enableWithdrawals(true));

            it('should fail with user as address(0)', async () => {
                accountDetails = getAccData(nullAddr, tokensDatabaseL1.fraxAddr, defaultSlippage);
                await assert.rejects(async () => {
                    await withdrawShareOZL(accountDetails, callerAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                }, {
                    name: 'Error',
                    message: (await err()).zeroAddress 
                });
            });
    
            it('should fail with account token as address(0)', async () => {
                accountDetails = getAccData(callerAddr, nullAddr, defaultSlippage);
                await assert.rejects(async () => {
                    await withdrawShareOZL(accountDetails, callerAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                }, {
                    name: 'Error',
                    message: (await err()).zeroAddress 
                });
            });
    
            it('should fail with account slippage as 0', async () => {
                accountDetails = getAccData(callerAddr, tokensDatabaseL1.fraxAddr, 0);
                await assert.rejects(async () => {
                    await withdrawShareOZL(accountDetails, callerAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                }, {
                    name: 'Error',
                    message: (await err()).zeroSlippage 
                });
            });
    
            it('should fail when account token is not in database', async () => {
                accountDetails = getAccData(callerAddr, deadAddr, defaultSlippage);
                await assert.rejects(async () => {
                    await withdrawShareOZL(accountDetails, callerAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                }, {
                    name: 'Error',
                    message: (await err(deadAddr)).tokenNotFound 
                });
            });

            it('should fail with receiver as address(0)', async () => {
                accountDetails = getAccData(callerAddr, tokensDatabaseL1.fraxAddr, defaultSlippage);
                await assert.rejects(async () => {
                    await withdrawShareOZL(accountDetails, nullAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                }, {
                    name: 'Error',
                    message: (await err()).zeroAddress 
                });
            });

            it('should fail with shares set as 0', async () => {
                await assert.rejects(async () => {
                    await withdrawShareOZL(accountDetails, callerAddr, 0);
                }, {
                    name: 'Error',
                    message: (await err()).zeroShares 
                });
            });
        });

        describe('addTokenToDatabase() / removeTokenFromDatabase()', async () => {
            beforeEach(async () => {
                //dForcePool --> USX: 0 / USDT: 2 / USDC: 1
                tokenSwap = [
                    2,
                    0,
                    usdtAddrArb,
                    usxAddr,
                    dForcePoolAddr
                ];

                token = [ tokensDatabaseL1.usxAddr, usxAddr ];
                if (!addFlag) await addTokenToDatabase(tokenSwap, token);
            });

            afterEach(() => addFlag = true);

            it('should allow the owner to add a new token (USX) to database / addTokenToDatabase()', async () => {
                balanceUSX = await USX.balanceOf(callerAddr);
                assert.equal(formatEther(balanceUSX), 0);
                
                accountDetails = getAccData(callerAddr, tokensDatabaseL1.usxAddr, defaultSlippage);
                await sendETH(accountDetails);
                
                balanceUSX = await USX.balanceOf(callerAddr);
                assert(formatEther(balanceUSX) > 0)
        
                doesExist = await queryTokenDatabase(usxAddr);
                assert(doesExist);
            });

            it('should not allow an unauthorized user to add a new token to database / addTokenToDatabase()', async () => {
                tokenSwap[3] = deadAddr;
                token = token.map(token => token = deadAddr);

                await assert.rejects(async () => {
                    await addTokenToDatabase(tokenSwap, token, 1);
                }, {
                    name: 'Error',
                    message: (await err(2)).notAuthorized 
                });
            });

            it('should allow the owner to remove a token (USX) from the database / removeTokenFromDatabase()', async () => {
                doesExist = await queryTokenDatabase(usxAddr);
                assert(doesExist);

                token[0] = tokensDatabaseL1.usxAddr;
                token[1] = usxAddr;
                await removeTokenFromDatabase(tokenSwap, token);
                doesExist = await queryTokenDatabase(usxAddr);
                assert(!doesExist);
            });

            it('should not allow an unauthorized user to remove a token (USX) from the database / removeTokenFromDatabase()', async () => {
                await assert.rejects(async () => {
                    await removeTokenFromDatabase(tokenSwap, token, 1);
                }, {
                    name: 'Error',
                    message: (await err(2)).notAuthorized 
                });
            });

            it('should not allow to add a new token with an L1 address when the l1Check has been disabled / addTokenToDatabase() - changeL1Check()', async () => {
                await ozlDiamond.changeL1Check(false);

                tokenSwap = [
                    1,
                    0,
                    usdtAddrArb,
                    usdcAddr,
                    crv2PoolAddr
                ];
                token = [ tokensDatabaseL1.usdcAddr, usdcAddr ];
                await removeTokenFromDatabase(tokenSwap, token);
                
                await assert.rejects(async () => {
                    await addTokenToDatabase(tokenSwap, token);
                }, {
                    name: 'Error',
                    message: (await err(token[0])).l1TokenDisabled 
                });

                //Clean up
                await ozlDiamond.changeL1Check(true);
                await addTokenToDatabase(tokenSwap, token);
            });
        });
    });

    xdescribe('ozExecutorFacet', async () => { 
        it('shout not allow an unauthorized user to run the function / updateExecutorState()', async () => {
            await assert.rejects(async () => {
                await ozlDiamond.updateExecutorState(evilAmount, deadAddr, 1, ops);
            }, {
                name: 'Error',
                message: (await err(callerAddr)).notAuthorized
            });
        });

        it('shout not allow an unauthorized user to run the function / executeFinalTrade()', async () => {
            evilSwapDetails = [0, 0, deadAddr, deadAddr, deadAddr];
            await assert.rejects(async () => {
                await ozlDiamond.executeFinalTrade(evilSwapDetails, 0, deadAddr, 2, ops);
            }, {
                name: 'Error',
                message: (await err(callerAddr)).notAuthorized
            });
        });

        it('shout not allow an unauthorized user to run the function / modifyPaymentsAndVolumeExternally()', async () => {
            await assert.rejects(async () => {
                await ozlDiamond.modifyPaymentsAndVolumeExternally(caller2Addr, evilAmount, 5, ops);
            }, {
                name: 'Error',
                message: (await err(callerAddr)).notAuthorized
            });
        });

        it('shout not allow an unauthorized user to run the function / transferUserAllocation()', async () => {
            await assert.rejects(async () => {
                await ozlDiamond.transferUserAllocation(deadAddr, deadAddr, evilAmount, evilAmount, 6, ops);
            }, {
                name: 'Error',
                message: (await err(callerAddr)).notAuthorized
            });
        });
    });

    xdescribe('oz4626Facet', async () => { 
        it('shout not allow an unauthorized user to run the function / deposit()', async () => {
            await assert.rejects(async () => {
                await ozlDiamond.deposit(evilAmount, deadAddr, 0, ops);
            }, {
                name: 'Error',
                message: (await err(callerAddr)).notAuthorized
            });
        });

        it('shout not allow an unauthorized user to run the function / redeem()', async () => {
            await assert.rejects(async () => {
                await ozlDiamond.redeem(evilAmount, caller2Addr, caller2Addr, 3, ops);
            }, {
                name: 'Error',
                message: (await err(callerAddr)).notAuthorized
            });
        });
    });

    xdescribe('oz20Facet', async () => { 
        it('shout not allow an unauthorized user to run the function / burn()', async () => {
            await assert.rejects(async () => {
                await ozlDiamond.burn(caller2Addr, evilAmount, 4, ops);
            }, {
                name: 'Error',
                message: (await err(callerAddr)).notAuthorized
            });
        });
    });

    xdescribe('ozLoupeFacet', async () => {
        beforeEach(async () => {
            accountDetails = getAccData(callerAddr, tokensDatabaseL1.usdcAddr, defaultSlippage);
            await sendETH(accountDetails);
        });

        it('should get the amount in USD of Assets Under Management / getAUM()', async () => {
            const [ wethUM, valueUM]  = await ozlDiamond.getAUM(); 
            assert(formatEther(valueUM) > 0);
        });

        it('should get the total volume in ETH / getTotalVolumeInETH()', async () => {
            totalVolume = await ozlDiamond.getTotalVolumeInETH();
            assert(formatEther(totalVolume) > 0);
        });

        it('should get the total volume in USD / getTotalVolumeInUSD()', async () => {
            totalVolume = await ozlDiamond.getTotalVolumeInUSD();
            assert(formatEther(totalVolume) > 0);
        });

        it('should get the Ozel balance in ETH and USD / getOzelBalances()', async () => {
            const [ wethUserShare, usdUserShare ] = await ozlDiamond.getOzelBalances(callerAddr);
            assert(formatEther(wethUserShare) > 0);
            assert(formatEther(usdUserShare) > 0);
        });

        it("should get the protocol's fee / getProtocolFee()", async () => {
            const fee = await ozlDiamond.getProtocolFee();
            assert.equal(Number(fee), protocolFee);
        });

        it('should return the owner of the account / getUserByL1Account()', async () => {
            const owner = await ozlDiamond.getUserByL1Account(deadAddr);
            assert.equal(owner, callerAddr);
        });
    });

    describe('ozCutFacet', async () => {
        it('shout not allow an external user to call the function / setAuthorizedCaller()', async () => {
            await assert.rejects(async () => {
                await ozlDiamond.connect(signer2).setAuthorizedCaller(callerAddr, true, ops);
            }, {
                name: 'Error',
                message: (await err(2)).notAuthorized
            });
        });

        it('should allow the owner to add a new caller and run exchangeToAccountToken() / setAuthorizedCaller()', async () => {
            const caller2AliasAddr = '0x81aa7970c51812dc3a010c7d01b50e0d17dc8ad9';
            let value = parseEther('1');
            ops.value = value;
            ops.to = caller2AliasAddr;
            await signer1.sendTransaction(ops);
            delete ops.to;
            delete ops.value;
            value = parseEther('0.1');

            await assert.rejects(async () => {
                await sendETH(accountDetails, 1);
            }, {
                name: 'Error',
                message: (await err(caller2Addr)).notAuthorized
            });

            await ozlDiamond.setAuthorizedCaller(caller2Addr, true, ops);

            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [caller2AliasAddr],
            });

            const caller2Alias = await hre.ethers.provider.getSigner(caller2AliasAddr);

            ops.value = value;
            await ozlDiamond.connect(caller2Alias).exchangeToAccountToken(accountDetails, value, deadAddr, ops);
            // await sendETH(accountDetails, 1);
            
            await hre.network.provider.request({
                method: "hardhat_stopImpersonatingAccount",
                params: [caller2AliasAddr],
            });

            //Clean up
            delete ops.value;
        });
    });
});
