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
    deployFacet,
    replaceForModVersion
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
    deadAddr,
    crvTricrypto
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
let selector, balanceRenBTC, balanceWETH, balanceUSDT, balanceWBTC, balanceMIM;
let yvCrvTri, balanceFRAX, testingNum, priceFeed, ethPrice, balanceUSDC, balanceTri;


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

        xdescribe('2nd user, 1st transfer / exchangeToUserToken()', async () => {
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

        xdescribe('1st user, 2nd transfer / exchangeToUserToken', async () => {
            it('should convert ETH to userToken (MIM)', async () => {
                userDetails[0] = callerAddr;
                userDetails[1] = mimAddr;

                await sendETH(userDetails);
                balanceMIM = await MIM.balanceOf(callerAddr);
                assert(formatEther(balanceMIM) > 0);

                //Cleans up by sending all MIM to another user
                await MIM.transfer(caller2Addr, balanceMIM);
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

        xdescribe("1st user's transfer of OZL tokens", async () => {
            it('should transfer half of OZL tokens to 2nd user', async () => {
                await transferOZL(caller2Addr, parseEther((OZLbalanceFirstUser / 2).toString()));
                OZLbalanceFirstUser = await balanceOfOZL(callerAddr);
                OZLbalanceSecondUser = await balanceOfOZL(caller2Addr);
                assert(OZLbalanceSecondUser > OZLbalanceFirstUser);

                totalOZLusers = OZLbalanceFirstUser + OZLbalanceSecondUser;
                assert(totalOZLusers <= 100 && totalOZLusers >= 99.9);
            });
        });

        xdescribe("1st user's OZL withdrawal", async () => {
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

        xdescribe('1st user, 3rd and 4th transfers', async () => {
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

        xdescribe('2nd user withdrawas 1/3 OZL tokens', async () => {

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

    describe('OZLFacet', async () => { //done
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

    describe('ExecutorFacet', async () => { //done
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
                    args: [evilSwapDetails, 0, deadAddr, 2]
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

    describe('oz4626Facet', async () => { //done
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

    describe('oz20Facet', async () => { //done
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
        const deployedVars = await deploy(); //await deploy(1)
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

        abi = ['function updateExecutorState(uint256 amount_, address user_, uint256 lockNum_) external payable'];
        iface = new ethers.utils.Interface(abi);
        selector = iface.getSighash('updateExecutorState');
    });

    it('should successfully stabilize the index for OZL balances calculations / _updateIndex() & balanceOf()', async () => {
        
        await replaceForModVersion('UpdateIndexV1', false, selector, userDetails, false, true);


        //-------------------
        
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
            if (i === 0) higherIndex = ozelIndex;

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



/**
 * It tests the anti-slippage system designed with try/catch blocks on the contracts
 * OZLFacet and ExecutorFacet.
 */
xdescribe('Anti-slippage system', async function () {
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
            usdtAddrArb,
            defaultSlippage
        ];

        abi = ['function exchangeToUserToken((address user, address userToken, uint256 userSlippage) userDetails_) external payable'];
        iface = new ethers.utils.Interface(abi);
        selector = iface.getSighash('exchangeToUserToken');
    });

    describe('Modified OZLFacet', async () => {

        /** 
         * Changed the first slippage for type(uint).max in _swapsForUserToken 
         * in order to provoke all trades to fail (due to slippage) and invoke
         * the last resort mechanism (send WETH back to user)
         */ 
        it('should replace swapsUserToken for V1 / _swapsForUserTokenV1', async () => {            
            ({ testingNum, balance: balanceWETH } = await replaceForModVersion('SwapsForUserTokenV1', true, selector, userDetails, true));
            assert.equal(formatEther(balanceWETH), 99.9);  
        });


        /**
         * Added a condition so it failes the first attempt due to slippage
         * but makes the trade in the second.
         */
        it('should replace swapsUserToken for V2 / _swapsForUserTokenV2', async () => {            
            ({ testingNum, balance: balanceUSDT } = await replaceForModVersion('SwapsForUserTokenV2', true, selector, userDetails));
            assert.equal(testingNum, 23);
            assert(balanceUSDT / 10 ** 6 > 0);

        });

        /**
         * Added a 2nd testVar that causes the 3rd swap attempt to fail. The 2nd
         * swap exchanged half of amountIn to userToken, and due to the failure on
         * the 3rd swap, the other half of amountIn was sent as WETH back to the user.
         */
        it('should replace swapsUserToken for V3 / _swapsForUserTokenV3', async () => {            
            balanceUSDTpre = (await USDT.balanceOf(callerAddr)) / 10 ** 6;
            balanceWETHpre = formatEther(await WETH.balanceOf(callerAddr));

            ({ testingNum, balance: balanceWETH } = await replaceForModVersion('SwapsForUserTokenV3', false, selector, userDetails, true));
            balanceWETH = formatEther(balanceWETH);
            halfInitialTransferInUSDT = 255000 / 2;
            halfInitialTransferInWETH = 100 / 2;

            balanceUSDTpost = (await USDT.balanceOf(callerAddr)) / 10 ** 6;
            balanceUSDTdiff = balanceUSDTpost - balanceUSDTpre;
            balanceWETHdiff = balanceWETH - balanceWETHpre;

            assert.equal(testingNum, 23);
            assert(balanceUSDTdiff > 0 && balanceUSDTdiff < halfInitialTransferInUSDT);
            assert(balanceWETHdiff > 0 && balanceWETHdiff < halfInitialTransferInWETH);
        });

        /**
         * Changed the slipppage amount for a type(uint).max condition so depositing
         * the dapp's fees failes and stores the fees into its own variable, which
         * are attempted to be deposited once again through any main action from
         * the app (deposit - withdraw).
         */
        it('should add failed fees to its own variable / _depositInDeFi()', async () => {            
            ({ testingNum } = await replaceForModVersion('DepositInDeFiV1', false, selector, userDetails));
            assert.equal(testingNum, 23);
        });

        /**
         * It deposits -in DeFi- the failedFees that weren't deposited in the prior test.
         */
        it('should deposit any failed fees found in the failedFees variable / _depositInDeFi()', async () => {            
            receipt = await sendETH(userDetails);
            assert.equal(getTestingNumber(receipt, true), 24);

            //Reverts to the original _depositInDeFi()
            await replaceForModVersion(ozlFacet, false, selector, userDetails, false, true);
        });
    });


    describe('Modified ExecutorFacet', async () => {
        before( async () => {
            abi = ['function executeFinalTrade((int128 tokenIn, int128 tokenOut, address baseToken, address userToken, address pool) swapDetails_, uint256 userSlippage_, address user_, uint256 lockNum_) external payable'];
            iface = new ethers.utils.Interface(abi);
            selector = iface.getSighash('executeFinalTrade');
            userDetails[1] = renBtcAddr;
        });

        /**
         * Changed slippage to type(uint).max in order to fail all trades and activate the last path
         */
        it("should send the funds to the user in their baseToken / ExecutorFacetV1 - executeFinalTrade()", async () => {            
            balanceWBTC = await WBTC.balanceOf(callerAddr);
            assert.equal(balanceWBTC / 10 ** 8, 0);

            ({ testingNum, balance: balanceWBTC } = await replaceForModVersion('ExecutorFacetV1', false, selector, userDetails, 2));
            balanceRenBTC = (await renBTC.balanceOf(callerAddr)) / 10 ** 8;
            assert.equal(testingNum, 23);
            
            assert(balanceWBTC / 10 ** 8 > 0);
            assert.equal(balanceRenBTC, 0);

            //Cleans up
            await WBTC.transfer(caller2Addr, balanceWBTC);
        });

        /**
         * Added an slippage condition so it fails the 1st attempt and activates the slippage mechanism.
         * All funds are in userToken through two swaps
         */
        it('should send userToken to the user in the 2nd loop iteration / ExecutorFacetV2 - executeFinalTrade()', async () => {            
            balanceRenBTC = (await renBTC.balanceOf(callerAddr)) / 10 ** 8;
            assert.equal(balanceRenBTC, 0);

            ({ testingNum, balance: balanceRenBTC } = await replaceForModVersion('ExecutorFacetV2', false, selector, userDetails, 3));
            assert.equal(testingNum, 23);

            balanceRenBTC = await renBTC.balanceOf(callerAddr);
            assert(balanceRenBTC / 10 ** 8 > 0);
            await renBTC.transfer(caller2Addr, balanceRenBTC);
        });


        /**
         * Fails the 1st and 3rd swapping attempts so half of the user's funds are traded in userToken
         * and the other half in the baseToken.
         */
        it('should divide the funds between baseToken and userToken / ExecutorFacetV3 - executeFinalTrade()', async () => {            
            balanceRenBTC = (await renBTC.balanceOf(callerAddr)) / 10 ** 8;
            assert(balanceRenBTC < 0.000001);

            balanceWBTC = (await WBTC.balanceOf(callerAddr)) / 10 ** 8;
            assert.equal(balanceWBTC, 0);

            ({ testingNum, balance: balanceRenBTC, receipt } = await replaceForModVersion('ExecutorFacetV3', false, selector, userDetails, 3));
            assert.equal(testingNum, 23);

            testingNum = getTestingNumber(receipt, true);
            assert.equal(testingNum, 24);

            balanceWBTC = await WBTC.balanceOf(callerAddr);
            assert(balanceRenBTC / 10 ** 8 > 1);
            assert(balanceWBTC / 10 ** 8 > 1);
        }); 


        /**
         * Changed slippage to type(uint).max in order to fail all trades and activate the last path
         * (2nd leg for non-BTC-2Pool coins)
         */
        it('should swap the funds to userToken only / ExecutorFacetV4 - executeFinalTrade()', async () => {            
            userDetails[1] = mimAddr;
            ({ testingNum, balance: balanceUSDT } = await replaceForModVersion('ExecutorFacetV4', false, selector, userDetails, false));
            assert.equal(testingNum, 23);
            assert(balanceUSDT > 0);
            await USDT.transfer(caller2Addr, balanceUSDT);
        });


        /**
         * Added an slippage condition so it fails the 1st attempt and activates the slippage mechanism.
         * All funds are in userToken through two swaps (2nd leg for non-BTC-2Pool coins)
         */
        it('should send userToken to the user in the 2nd loop iteration / ExecutorFacetV5 - executeFinalTrade()', async () => {
            userDetails[1] = mimAddr;
            balanceMIM = formatEther(await MIM.balanceOf(callerAddr));
            assert.equal(balanceMIM, 0);

            ({ testingNum, balance: balanceMIM } = await replaceForModVersion('ExecutorFacetV5', false, selector, userDetails, 4));
            assert.equal(testingNum, 23);
            assert(formatEther(balanceMIM) > 0);

            await MIM.transfer(caller2Addr, balanceMIM);
        });


        /**
         * Fails the 1st and 3rd swapping attempts so half of the user's funds are traded in userToken
         * and the other half in the baseToken.
         */
        it('should divide the funds between baseToken and userToken / ExecutorFacetV6 - executeFinalTrade()', async () => {            
            userDetails[1] = mimAddr;
            balanceMIM = formatEther(await MIM.balanceOf(callerAddr));
            assert.equal(balanceMIM, 0);

            balanceUSDT = (await USDT.balanceOf(callerAddr)) / 10 ** 6;
            assert.equal(balanceUSDT, 0);

            ({ testingNum, balance: balanceMIM } = await replaceForModVersion('ExecutorFacetV6', false, selector, userDetails, 4));
            assert.equal(testingNum, 23);
            assert(formatEther(balanceMIM) > 0);

            balanceUSDT = (await USDT.balanceOf(callerAddr)) / 10 ** 6;
            assert(balanceUSDT > 0);
        });





    });

   


   
    


});



describe('My Revenue', async function() {
    this.timeout(1000000);

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

        abi = ['function checkForRevenue() external payable'];
        iface = new ethers.utils.Interface(abi);
        selector = iface.getSighash('checkForRevenue');

        // priceFeed = await hre.ethers.getContractAt('AggregatorV3Interface', chainlinkAggregatorAddr);
        // ([ y, ethPrice ] = await priceFeed.latestRoundData());

        tricryptoCrv = await hre.ethers.getContractAt('IERC20', crvTricrypto);
    });


    it('should send the accrued revenue to the deployer in USDC / CheckForRevenueV1 - checkForRevenue()', async () => {
        balanceUSDC = await USDC.balanceOf(callerAddr) / 10 ** 6;
        assert.equal(balanceUSDC, 0);

        await replaceForModVersion('CheckForRevenueV1', false, selector, userDetails);
        receipt = await sendETH(userDetails);

        testingNum = getTestingNumber(receipt);
        assert.equal(testingNum, 23);

        balanceUSDC = await USDC.balanceOf(callerAddr) / 10 ** 6;
        assert(balanceUSDC > 0);
    }); 

    it('should send the accrued revenue to the deployer in tricrypto / CheckForRevenueV2 - checkForRevenue()', async () => {
        balanceTri = formatEther(await tricryptoCrv.balanceOf(callerAddr));
        assert.equal(balanceTri, 0);

        await replaceForModVersion('CheckForRevenueV2', false, selector, userDetails);
        receipt = await sendETH(userDetails);

        testingNum = getTestingNumber(receipt);
        assert.equal(testingNum, 23);

        balanceTri = formatEther(await tricryptoCrv.balanceOf(callerAddr));
        console.log('balance tri: ', balanceTri);
        assert(balanceTri > 0);
    });


    xit('should give me tons of moneyyy', async () => {

        x = formatEther(await WETH.balanceOf(callerAddr));
        console.log('weth pre: ', x);

        x = formatEther(await FRAX.balanceOf(callerAddr));
        console.log('frax pre: ', x);
        
        await sendETH(userDetails);
        await sendETH(userDetails);

        x = formatEther(await WETH.balanceOf(callerAddr));
        console.log('weth post: ', x);
        
        x = formatEther(await FRAX.balanceOf(callerAddr));
        console.log('frax post: ', x);

    });


    




});