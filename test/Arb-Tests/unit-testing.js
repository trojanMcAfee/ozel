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
    removeTokenFromDatabase
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
    tokensDatabaseL1
} = require('../../scripts/state-vars.js');



let accountDetails;
let callerAddr, caller2Addr;
let deployedDiamond, ozlDiamond;
let evilAmount, evilSwapDetails;
let tokenSwap, token;
let addFlag, totalVolume;


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
    
        getVarsForHelpers(deployedDiamond, ozlFacet);

        accountDetails = [
            callerAddr,
            tokensDatabaseL1.fraxAddr,
            defaultSlippage,
            'myAccount'
        ];

        ozlDiamond = await hre.ethers.getContractAt(diamondABI, deployedDiamond.address);
        evilAmount = parseEther('1000');
    });

    describe('OZLFacet', async () => { 
        describe('exchangeToAccountToken()', async () => {
            it('should fail with user as address(0)', async () => {
                accountDetails[0] = nullAddr;
                await assert.rejects(async () => {
                    await sendETH(accountDetails);
                }, {
                    name: 'Error',
                    message: (await err()).zeroAddress 
                });
            });
    
            it('should fail with account token as address(0)', async () => {
                accountDetails[0] = callerAddr;
                accountDetails[1] = nullAddr;
                await assert.rejects(async () => {
                    await sendETH(accountDetails);
                }, {
                    name: 'Error',
                    message: (await err()).zeroAddress 
                });
            });
    
            it('should fail with slippage as 0', async () => {
                accountDetails[1] = tokensDatabaseL1.fraxAddr;
                accountDetails[2] = 0;
                await assert.rejects(async () => {
                    await sendETH(accountDetails);
                }, {
                    name: 'Error',
                    message: (await err()).zeroSlippage 
                });
            });
    
            it('should fail when account token is not in database', async () => {
                accountDetails[1] = deadAddr;
                accountDetails[2] = defaultSlippage;
                await assert.rejects(async () => {
                    await sendETH(accountDetails);
                }, {
                    name: 'Error',
                    message: (await err(deadAddr)).tokenNotFound 
                });
            });
    
            it('should fail when msg.value is equal to 0', async () => {
                accountDetails[1] = tokensDatabaseL1.usdcAddr;
                await assert.rejects(async () => {
                    await sendETH(accountDetails, 'no value');
                }, {
                    name: 'Error',
                    message: (await err()).zeroMsgValue 
                });
            });
        });

        describe('withdrawUserShare()', async () => {
            beforeEach(async () => await enableWithdrawals(true));

            it('should fail with user as address(0)', async () => {
                accountDetails[0] = nullAddr;
                await assert.rejects(async () => {
                    await withdrawShareOZL(accountDetails, callerAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                }, {
                    name: 'Error',
                    message: (await err()).zeroAddress 
                });
            });
    
            it('should fail with account token as address(0)', async () => {
                accountDetails[0] = callerAddr;
                accountDetails[1] = nullAddr;
                await assert.rejects(async () => {
                    await withdrawShareOZL(accountDetails, callerAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                }, {
                    name: 'Error',
                    message: (await err()).zeroAddress 
                });
            });
    
            it('should fail with account slippage as 0', async () => {
                accountDetails[1] = tokensDatabaseL1.fraxAddr;
                accountDetails[2] = 0;
                await assert.rejects(async () => {
                    await withdrawShareOZL(accountDetails, callerAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                }, {
                    name: 'Error',
                    message: (await err()).zeroSlippage 
                });
            });
    
            it('should fail when account token is not in database', async () => {
                accountDetails[1] = deadAddr;
                accountDetails[2] = defaultSlippage;
                await assert.rejects(async () => {
                    await withdrawShareOZL(accountDetails, callerAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                }, {
                    name: 'Error',
                    message: (await err(deadAddr)).tokenNotFound 
                });
            });

            it('should fail with receiver as address(0)', async () => {
                accountDetails[1] = tokensDatabaseL1.fraxAddr;
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
                
                accountDetails[1] = tokensDatabaseL1.usxAddr;
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
        });
    });

    describe('ozExecutorFacet', async () => { 
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

    describe('oz4626Facet', async () => { 
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

    describe('oz20Facet', async () => { 
        it('shout not allow an unauthorized user to run the function / burn()', async () => {
            await assert.rejects(async () => {
                await ozlDiamond.burn(caller2Addr, evilAmount, 4, ops);
            }, {
                name: 'Error',
                message: (await err(callerAddr)).notAuthorized
            });
        });
    });

    describe('ozLoupeFacet', async () => {
        beforeEach(async () => {
            accountDetails[1] = tokensDatabaseL1.usdcAddr;
            await sendETH(accountDetails);
        });

        it('should get the amount in USD of Assets Under Management / getAUM()', async () => {
            const [ wethUM, valueUM]  = await ozlDiamond.getAUM(); 
            assert(formatEther(valueUM) > 20);
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
            const [ wethUserShare, usdUserShare ] = await ozlDiamond.getOzelBalances(accountDetails[0]);
            assert(formatEther(wethUserShare) > 0);
            assert(formatEther(usdUserShare) > 0);
        });

        it("should get the protocol's fee / getProtocolFee()", async () => {
            const fee = await ozlDiamond.getProtocolFee();
            assert.equal(Number(fee), protocolFee);
        });
    });
});