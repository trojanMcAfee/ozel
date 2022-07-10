const { ethers } = require("ethers");
const assert = require('assert');
const { parseEther, formatEther, defaultAbiCoder: abiCoder, keccak256 } = ethers.utils;
// const { deploy } = require('./deploy.js');
const { Bridge } = require('arb-ts');
const { hexDataLength } = require('@ethersproject/bytes');
require('dotenv').config();

const { err } = require('./errors.js');

const {
    balanceOfOZL, 
    transferOZL, 
    withdrawShareOZL, 
    getVarsForHelpers,
    sendETH,
    getCalldata,
    getCalldata2,
    enableWithdrawals,
    deploy,
    getOzelIndex,
    callDiamondProxy,
    addTokenToDatabase,
    getRegulatorCounter,
    getTestingNumber,
    deployFacet
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



let userDetails;
let FRAX, WBTC, MIM, USDT, USDC;
let callerAddr, caller2Addr;
let ozelIndex, newOzelIndex;
let balance, OZLbalanceFirstUser, OZLbalanceSecondUser, totalOZLusers, halfOZLbalance;
let deployedDiamond;
let preYvCrvBalance, currYvCrvBalance;
let toTransfer;
let evilAmount, evilSwapDetails;
let accounts, signers, ozelBalance, regulatorCounter, higherIndex;
let tx, receipt, filter, topics;
let iface, encodedData, args, abi;
let selector, swapForUserTokenMod;


xdescribe('Arbitrum-side', async function () {
    this.timeout(1000000);

    before( async () => {
        const deployedVars = await deploy();
        ({
            deployedDiamond, 
            WETH,
            USDT,
            WBTC,
            renBTC,
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

        userDetails = [
            callerAddr,
            fraxAddr,
            defaultSlippage
        ];
    });

    describe('Standard user interaction', async () => {
        /**
         * Since Curve doesn't have testnets, sendETH() sends ETH directly to
         * exchangeToUserToken() which would simulate an Arbitrum L1 > L2 tx where
         * sendToArb() in L1 in ozPayMe would send the ETH to OZLFacet in L2
        */

        describe('1st user, 1st transfer / exchangeToUserToken()', async () => {
            it('should convert ETH to userToken (FRAX)', async () => {
                await sendETH(userDetails); 
                assert(formatEther(await FRAX.balanceOf(callerAddr)) > 0);
            });

            it('should initiate the Ozel index', async () => {
                ozelIndex = await getOzelIndex();
                assert.equal(formatEther(ozelIndex), 1200000.0);
            });

            it('should allocate 1st user with OZL tokens', async () => {
                assert.equal(await balanceOfOZL(callerAddr), 100.0);
            });

            it('should allocate OZLDiamond with yvCrvTricrypto tokens', async () => {
                preYvCrvBalance = formatEther(await yvCrvTri.balanceOf(deployedDiamond.address));
                assert(preYvCrvBalance > 0);
            });
        });

        describe('2nd user, 1st transfer / exchangeToUserToken()', async () => {
            it('should convert ETH to userToken (WBTC)', async () => {
                userDetails[0] = caller2Addr;
                userDetails[1] = wbtcAddr;

                await sendETH(userDetails); 
                assert(formatEther(await FRAX.balanceOf(callerAddr)) > 0);
            });

            it('should re-calculate the Ozel index', async () => {
                ozelIndex = await getOzelIndex();
                assert.equal(formatEther(ozelIndex), 600000.0);
            });

            it('should distribute OZL tokens equally between users', async () => {
                assert.equal(await balanceOfOZL(callerAddr), 50.0);
                assert.equal(await balanceOfOZL(caller2Addr), 50.0);
            });

            it('should add more yvCrvTricrypto tokens to OZLDiamond', async () => {
                currYvCrvBalance = formatEther(await yvCrvTri.balanceOf(deployedDiamond.address));
                assert(currYvCrvBalance > preYvCrvBalance);
            });
        });

        describe('1st user, 2nd transfer / exchangeToUserToken', async () => {
            it('should convert ETH to userToken (MIM)', async () => {
                userDetails[0] = callerAddr;
                userDetails[1] = mimAddr;

                await sendETH(userDetails);
                assert(formatEther(await MIM.balanceOf(callerAddr)) > 0);
            });
            
            it('should decrease the Ozel index to its lowest level', async () => {
                newOzelIndex = await getOzelIndex();
                assert(newOzelIndex < ozelIndex);
            });

            it('should leave the first user with more OZL tokens than 2nd user', async () => {

                OZLbalanceFirstUser = await balanceOfOZL(callerAddr);
                OZLbalanceSecondUser = await balanceOfOZL(caller2Addr);
                assert(OZLbalanceFirstUser > OZLbalanceSecondUser);

                totalOZLusers = OZLbalanceFirstUser + OZLbalanceSecondUser;
                assert(totalOZLusers <= 100 && totalOZLusers >= 99.9);
            });

            it("should increase yvCrvTricrypto's balance on OZLDiamond", async () => {
                preYvCrvBalance = currYvCrvBalance;
                currYvCrvBalance = formatEther(await yvCrvTri.balanceOf(deployedDiamond.address));
                assert(currYvCrvBalance > preYvCrvBalance);
            });
        });

        describe("1st user's transfer of OZL tokens", async () => {
            it('should transfer half of OZL tokens to 2nd user', async () => {
                await transferOZL(caller2Addr, parseEther((OZLbalanceFirstUser / 2).toString()));
                OZLbalanceFirstUser = await balanceOfOZL(callerAddr);
                OZLbalanceSecondUser = await balanceOfOZL(caller2Addr);
                assert(OZLbalanceSecondUser > OZLbalanceFirstUser);

                totalOZLusers = OZLbalanceFirstUser + OZLbalanceSecondUser;
                assert(totalOZLusers <= 100 && totalOZLusers >= 99.9);
            });
        });

        describe("1st user's OZL withdrawal", async () => {
            it("should have a balance of the dapp's fees on userToken (USDC)", async () => {
                await enableWithdrawals(true);
                userDetails[1] = usdcAddr;
                await withdrawShareOZL(userDetails, callerAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                balance = await USDC.balanceOf(callerAddr);
                assert(balance > 0);
            });

            it('should leave 2nd user with all OZL tokens', async () => {
                OZLbalanceFirstUser = await balanceOfOZL(callerAddr);
                OZLbalanceSecondUser = await balanceOfOZL(caller2Addr);
                ozelIndex = await getOzelIndex();

                assert.equal(OZLbalanceFirstUser, 0);
                assert.equal(OZLbalanceSecondUser, 100.0);
            });
        });

        describe('1st user, 3rd and 4th transfers', async () => {
            it('should leave the 2nd user with more OZL tokens', async() => {
                await sendETH(userDetails);
                OZLbalanceFirstUser = await balanceOfOZL(callerAddr);
                OZLbalanceSecondUser = await balanceOfOZL(caller2Addr);
                assert(OZLbalanceSecondUser > OZLbalanceFirstUser);

                totalOZLusers = OZLbalanceFirstUser + OZLbalanceSecondUser;
                assert(totalOZLusers <= 100 && totalOZLusers >= 99.9);
            });

            it('should leave the 1st user with more OZL tokens after 2nd transfer 1/3', async () => {
                toTransfer = await balanceOfOZL(caller2Addr) / 3;
                await transferOZL(callerAddr, parseEther(toTransfer.toString()), 1);
                OZLbalanceFirstUser = await balanceOfOZL(callerAddr);
                OZLbalanceSecondUser = await balanceOfOZL(caller2Addr);
                assert(OZLbalanceFirstUser > OZLbalanceSecondUser);

                totalOZLusers = OZLbalanceFirstUser + OZLbalanceSecondUser;
                assert(totalOZLusers <= 100 && totalOZLusers >= 99.9);

            });
        });

        describe('2nd user withdrawas 1/3 OZL tokens', async () => {

            it("should have a balance of the dapp's fees on userToken (USDT)", async () => {
                userDetails[0] = caller2Addr;
                userDetails[1] = usdtAddrArb;
                await withdrawShareOZL(userDetails, caller2Addr, parseEther(toTransfer.toString()), 1);
                balance = await USDT.balanceOf(caller2Addr);
                assert(balance > 0);
            });

            it('leave 1st user with more OZL tokens', async () => {
                OZLbalanceFirstUser = await balanceOfOZL(callerAddr);
                OZLbalanceSecondUser = await balanceOfOZL(caller2Addr);
                assert(OZLbalanceFirstUser > OZLbalanceSecondUser);

                totalOZLusers = OZLbalanceFirstUser + OZLbalanceSecondUser;
                assert(totalOZLusers <= 100 && totalOZLusers >= 99.9);
            });

            it('should leave OZLDiamond with a reduction on yvCrvTricrypto tokens', async () => {
                preYvCrvBalance = currYvCrvBalance;
                currYvCrvBalance = formatEther(await yvCrvTri.balanceOf(deployedDiamond.address));
                assert(currYvCrvBalance < preYvCrvBalance);
            });
        });
    });
});


xdescribe('Unit testing', async function () {
    this.timeout(1000000);

    before( async () => {
        const deployedVars = await deploy();
        ({
            deployedDiamond, 
            WETH,
            USDT,
            WBTC,
            renBTC,
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

        userDetails = [
            callerAddr,
            fraxAddr,
            defaultSlippage
        ];
    });

    describe('OZLFacet', async () => {
        describe('exchangeToUserToken()', async () => {
            it('should fail with user as address(0)', async () => {
                userDetails[0] = nullAddr;
                await assert.rejects(async () => {
                    await sendETH(userDetails);
                }, {
                    name: 'Error',
                    message: err().zeroAddress 
                });
            });
    
            it('should fail with userToken as address(0)', async () => {
                userDetails[0] = callerAddr;
                userDetails[1] = nullAddr;
                await assert.rejects(async () => {
                    await sendETH(userDetails);
                }, {
                    name: 'Error',
                    message: err().zeroAddress 
                });
            });
    
            it('should fail with userSlippage as 0', async () => {
                userDetails[1] = fraxAddr;
                userDetails[2] = 0;
                await assert.rejects(async () => {
                    await sendETH(userDetails);
                }, {
                    name: 'Error',
                    message: err().zeroSlippage 
                });
            });
    
            it('should fail when userToken is not in database', async () => {
                userDetails[1] = deadAddr;
                userDetails[2] = defaultSlippage;
                await assert.rejects(async () => {
                    await sendETH(userDetails);
                }, {
                    name: 'Error',
                    message: err().tokenNotFound 
                });
            });
    
            it('should fail when msg.value is equal to 0', async () => {
                userDetails[1] = usdcAddr;
                await assert.rejects(async () => {
                    await sendETH(userDetails, '');
                }, {
                    name: 'Error',
                    message: err().zeroMsgValue 
                });
            });
        });

        describe('withdrawUserShare()', async () => {
            it('should fail with user as address(0)', async () => {
                await enableWithdrawals(true);
                userDetails[0] = nullAddr;
                await assert.rejects(async () => {
                    await withdrawShareOZL(userDetails, callerAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                }, {
                    name: 'Error',
                    message: err().zeroAddress 
                });
            });
    
            it('should fail with userToken as address(0)', async () => {
                userDetails[0] = callerAddr;
                userDetails[1] = nullAddr;
                await assert.rejects(async () => {
                    await withdrawShareOZL(userDetails, callerAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                }, {
                    name: 'Error',
                    message: err().zeroAddress 
                });
            });
    
            it('should fail with userSlippage as 0', async () => {
                userDetails[1] = fraxAddr;
                userDetails[2] = 0;
                await assert.rejects(async () => {
                    await withdrawShareOZL(userDetails, callerAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                }, {
                    name: 'Error',
                    message: err().zeroSlippage 
                });
            });
    
            it('should fail when userToken is not in database', async () => {
                userDetails[1] = deadAddr;
                userDetails[2] = defaultSlippage;
                await assert.rejects(async () => {
                    await withdrawShareOZL(userDetails, callerAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                }, {
                    name: 'Error',
                    message: err().tokenNotFound 
                });
            });

            it('should fail with receiver as address(0)', async () => {
                userDetails[1] = fraxAddr;
                await assert.rejects(async () => {
                    await withdrawShareOZL(userDetails, nullAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
                }, {
                    name: 'Error',
                    message: err().zeroAddress 
                });
            });

            it('should fail with shares set as 0', async () => {
                await assert.rejects(async () => {
                    await withdrawShareOZL(userDetails, callerAddr, 0);
                }, {
                    name: 'Error',
                    message: err().zeroShares 
                });
            });
        });

        it('should allow the owner to add a new userToken to database / addTokenToDatabase()', async () => {
            await addTokenToDatabase(renBtcAddr);
        });

        it('should not allow an unauthorized user to add a new userToken to database / addTokenToDatabase()', async () => {
            await assert.rejects(async () => {
                await addTokenToDatabase(deadAddr, 1);
            }, {
                name: 'Error',
                message: err(2).notAuthorized 
            });
        });
    });

    describe('ExecutorFacet', async () => {
        it('shout not allow an unauthorized user to run the function / updateExecutorState()', async () => {
            evilAmount = parseEther('1000');
            await assert.rejects(async () => {
                await callDiamondProxy({
                    method: 'updateExecutorState',
                    args: [evilAmount, deadAddr, 1]
                });
            }, {
                name: 'Error',
                message: err().notAuthorized 
            });
        });

        it('shout not allow an unauthorized user to run the function / executeFinalTrade()', async () => {
            evilSwapDetails = [0, 0, deadAddr, deadAddr, deadAddr];
            await assert.rejects(async () => {
                await callDiamondProxy({
                    method: 'executeFinalTrade',
                    args: [evilSwapDetails, 0, 2]
                });
            }, {
                name: 'Error',
                message: err().notAuthorized 
            });
        });

        it('shout not allow an unauthorized user to run the function / modifyPaymentsAndVolumeExternally()', async () => {
            await assert.rejects(async () => {
                await callDiamondProxy({
                    method: 'modifyPaymentsAndVolumeExternally',
                    args: [caller2Addr, evilAmount, 5]
                });
            }, {
                name: 'Error',
                message: err().notAuthorized 
            });
        });

        it('shout not allow an unauthorized user to run the function / transferUserAllocation()', async () => {
            await assert.rejects(async () => {
                await callDiamondProxy({
                    method: 'transferUserAllocation',
                    args: [deadAddr, deadAddr, evilAmount, evilAmount, 6]
                });
            }, {
                name: 'Error',
                message: err().notAuthorized 
            });
        });
    });

    describe('oz4626Facet', async () => {
        it('shout not allow an unauthorized user to run the function / deposit()', async () => {
            await assert.rejects(async () => {
                await callDiamondProxy({
                    method: 'deposit',
                    args: [evilAmount, deadAddr, 0]
                });
            }, {
                name: 'Error',
                message: err().notAuthorized 
            });
        });

        it('shout not allow an unauthorized user to run the function / redeem()', async () => {
            await assert.rejects(async () => {
                await callDiamondProxy({
                    method: 'redeem',
                    args: [evilAmount, caller2Addr, caller2Addr, 3]
                });
            }, {
                name: 'Error',
                message: err().notAuthorized 
            });
        });



    });

    describe('oz20Facet', async () => {
        it('shout not allow an unauthorized user to run the function / burn()', async () => {
            await assert.rejects(async () => {
                await callDiamondProxy({
                    method: 'burn',
                    args: [caller2Addr, evilAmount, 4]
                });
            }, {
                name: 'Error',
                message: err().notAuthorized 
            });
        });


    });


});


/**
 * The test from below tests the stabilizing mechanism performed on updateIndex()
 * and balanceOf() which involves the main variable (Ozel Index) and its stabilizing
 * variables. 
 * 
 * It uses the ModExecutorFacet contract with hard-coded values in order to represent
 * a point in the future where the mechanism kicks in. 
 * 
 * The two main differences from the real implementation on ExecutorFacet is on
 * line 133, 136 140 (from the Mod version) that uses much lower values in order to
 * show the workings of the mechanism.
 */

xdescribe('Ozel Index', async function () {
    this.timeout(100000000000000000000);

    before( async () => {
        const deployedVars = await deploy(1);
        ({
            deployedDiamond, 
            WETH,
            USDT,
            WBTC,
            renBTC,
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

        userDetails = [
            callerAddr,
            fraxAddr,
            defaultSlippage
        ];
    });

    it('should successfully stabilize the index for OZL balances calculations / _updateIndex() & balanceOf()', async () => {
        userDetails[1] = usdcAddr;
        accounts = await hre.ethers.provider.listAccounts();
        signers = await hre.ethers.getSigners();

        for (let i=5; i < accounts.length; i++) {
            await signers[i].sendTransaction({
                to: accounts[4],
                value: parseEther('9999')
            });
        }

            const bal4 = formatEther(await signers[4].getBalance());

        for (let i=0; i < 4; i++) {
            const balQ = bal4 / 4;
            await signers[4].sendTransaction({
                to: accounts[i],
                value: parseEther(i === 3 ? (balQ - 1).toString() : balQ.toString())
            });
        }

        console.log('.');
        console.log('*** stabilization happens in tx #16 ***');
        console.log('calculating...');
        
        for (let i=0, j=0; i < 19; i++, j++) { 
            console.log('.');
            console.log(`tx #${i}`);

            if (j == 4) j = 0;
            userDetails[0] = await signers[j].getAddress();

            await sendETH(userDetails, j); 

            ozelIndex = formatEther(await getOzelIndex());
            if (i === 0) {
                higherIndex = ozelIndex;
                console.log('high-once: ', higherIndex);
            }
            console.log('Ozel Index: ', ozelIndex);

            a = await balanceOfOZL(accounts[0]);
            console.log('OZL bal #0: ', a);
            b = await balanceOfOZL(accounts[1]);
            console.log('OZL bal #1: ', b);
            c = await balanceOfOZL(accounts[2]);
            console.log('OZL bal #2: ', c);
            d = await balanceOfOZL(accounts[3]);
            console.log('OZL bal #3: ', d);
            const total = a + b + c + d;
            console.log('TOTAL: ', total);

            regulatorCounter = await getRegulatorCounter();

            assert(total <= 100 && total >= 99.85);
            assert(ozelIndex > 0 && ozelIndex <= higherIndex);
            assert(regulatorCounter < 2 && regulatorCounter >= 0);
        }
    });



});


describe('Anti-slippage system', async function () {
    this.timeout(1000000);


    before( async () => {
        const deployedVars = await deploy();
        ({
            deployedDiamond, 
            WETH,
            USDT,
            WBTC,
            renBTC,
            USDC,
            MIM,
            FRAX,
            crvTri,
            callerAddr, 
            caller2Addr,
            ozlFacet,
            yvCrvTri,
            ozlFacet
        } = deployedVars);
    
        getVarsForHelpers(deployedDiamond, ozlFacet);

        userDetails = [ 
            callerAddr,
            usdtAddrArb,
            defaultSlippage
        ];
    });




    /**
     * Added a 2nd testVar that causes the 3rd swap attempt to fail. The 2nd
     * swap exchanged half of amountIn to userToken, and due to the failure on
     * the 3rd swap, the other half of amountIn was sent as WETH back to the user.
     */
    xdescribe('ModOZLFacet3', async function () {
        before( async () => {
            const deployedVars = await deploy(4);
            ({
                deployedDiamond, 
                WETH,
                USDT,
                WBTC,
                renBTC,
                USDC,
                MIM,
                FRAX,
                crvTri,
                callerAddr, 
                caller2Addr,
                ozlFacet,
                yvCrvTri,
                ozlFacet
            } = deployedVars);
        
            getVarsForHelpers(deployedDiamond, ozlFacet);
    
            userDetails = [ 
                callerAddr,
                usdtAddrArb,
                defaultSlippage
            ];
        });


        it('should convert to half to userToken and half to WETH / _swapsForUserToken()', async () => {
            balance = await USDT.balanceOf(callerAddr);
            assert.equal(balance, 0);
            balance = await WETH.balanceOf(callerAddr);
            assert.equal(balance, 0);
    
            receipt = await sendETH(userDetails); 
           
            balance = await USDT.balanceOf(callerAddr);
            assert(balance > 170000);
            balance = await WETH.balanceOf(callerAddr)
            assert(balance > 49);

            assert.equal(getTestingNumber(receipt), 23);
        });

    });


    //------------

    /** NEW VERSION
     * Changed the first slippage for type(uint).max in_swapsForUserToken 
     * in order to provoke all trades to fail (due to slippage) and invoke
     * the last resort mechanism (send WETH back to user)
     */ 
    describe('Modified OZLFacet', async () => {

        it('should replace swapsUserToken for V1 / _swapsForUserTokenV2()', async () => {
            abi = ['function exchangeToUserToken((address user, address userToken, uint256 userSlippage) userDetails_) external payable'];
            iface = new ethers.utils.Interface(abi);
            selector = iface.getSighash('exchangeToUserToken');

            swapForUserTokenMod = await deployFacet('SwapsForUserTokenV1');
            faceCutArgs = [[ swapForUserTokenMod.address, 1, [selector] ]];
            
            balance = await USDT.balanceOf(callerAddr);
            assert.equal(balance, 0);

            await callDiamondProxy({
                method: 'diamondCut',
                args: [faceCutArgs, nullAddr,'0x']
            });
    
            await sendETH(userDetails); 

            balance = formatEther(await WETH.balanceOf(callerAddr));
            assert.equal(balance, 99.9);  
        });


    });

    //------------


    /**
     * Changed the first slippage for type(uint).max in_swapsForUserToken 
     * in order to provoke all trades to fail (due to slippage) and invoke
     * the last resort mechanism (send WETH back to user)
     */
    xdescribe('ModOZLFacet', async function () {
        before( async () => {
            const deployedVars = await deploy(2);
            ({
                deployedDiamond, 
                WETH,
                USDT,
                WBTC,
                renBTC,
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
    
            userDetails = [ 
                callerAddr,
                usdtAddrArb,
                defaultSlippage
            ];
        });

        it('should send WETH to the user as last resort / _swapsForUserToken()', async () => {
            await sendETH(userDetails); 
            balance = formatEther(await WETH.balanceOf(callerAddr));
            assert.equal(balance, 99.9);    
        }); 
    });


    /**
     * Added a condition so it failes the first attempt due to slippage
     * but makes the trade in the second.
     */
     describe('ModOZLFacet2', async function () {
        // before( async () => {
        //     const deployedVars = await deploy(2); //deploy(3) to get ModOZLFacet2
        //     ({
        //         deployedDiamond, 
        //         WETH,
        //         USDT,
        //         WBTC,
        //         renBTC,
        //         USDC,
        //         MIM,
        //         FRAX,
        //         crvTri,
        //         callerAddr, 
        //         caller2Addr,
        //         ozlFacet,
        //         yvCrvTri,
        //         ozlFacet
        //     } = deployedVars);
        
        //     getVarsForHelpers(deployedDiamond, ozlFacet);
    
        //     userDetails = [ 
        //         callerAddr,
        //         usdtAddrArb,
        //         defaultSlippage
        //     ];
        // });


        it('should replace swapsUserToken for V2 / _swapsForUserTokenV2()', async () => {
            // abi = ['function exchangeToUserToken(tuple(address user, address userToken, uint256 userSlippage) userDetails_) external payable'];
            // iface = new ethers.utils.Interface(abi);
            // selector = iface.getSighash('exchangeToUserToken');
            swapForUserTokenMod = await deployFacet('SwapsForUserTokenV2');
            faceCutArgs = [[ swapForUserTokenMod.address, 1, [selector] ]];
            
            balance = await USDT.balanceOf(callerAddr);
            assert.equal(balance, 0);

            await callDiamondProxy({
                method: 'diamondCut',
                args: [faceCutArgs, nullAddr,'0x']
            });
    
            receipt = await sendETH(userDetails); 
            assert.equal(getTestingNumber(receipt), 23);
            
            balance = await USDT.balanceOf(callerAddr);
            assert(balance > 255000);
        });


        xit('should convert to userToken on 2nd attempt / _swapsForUserToken()', async () => {
            balance = await USDT.balanceOf(callerAddr);
            assert.equal(balance, 0);
    
            receipt = await sendETH(userDetails); 

            assert.equal(getTestingNumber(receipt), 23);
            
            balance = await USDT.balanceOf(callerAddr);
            assert(balance > 255000);
        });
        //move all modOZL tests to replaceFunctions
    });
    


});