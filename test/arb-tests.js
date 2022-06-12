const { ethers } = require("ethers");
const assert = require('assert');
const { parseEther, formatEther, defaultAbiCoder: abiCoder, keccak256 } = ethers.utils;
// const { deploy } = require('./deploy.js');
const { Bridge } = require('arb-ts');
const { hexDataLength } = require('@ethersproject/bytes');
require('dotenv').config();

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
    getDistributionIndex
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



let userDetails;
let FRAX, WBTC, MIM, USDT, USDC;
let callerAddr, caller2Addr;
let distributionIndex, newDistributionIndex;
let balance, OZLbalanceFirstUser, OZLbalanceSecondUser, totalOZLusers, halfOZLbalance;
let deployedDiamond;
let preYvCrvBalance, currYvCrvBalance;
let toTransfer;


describe('Arbitrum-side', async () => {
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

    describe('Optimistic deployment', async () => {
        /**
         * Since Curve doesn't have testnets, sendETH() sends ETH directly to
         * exchangeToUserToken() which would simulate an Arbitrum L1 > L2 tx where
         * sendToArb() in L1 in ozPayMe would send the ETH to OZLFacet in L2
        */

        describe('1st user, 1st transfer / exchangeToUserToken()', async () => {
            it('should convert ETH to userToken (FRAX)', async () => {
                await sendETH(userDetails); 
                assert(formatEther(await FRAX.balanceOf(callerAddr)) > 0);
            }).timeout(1000000);

            it('should initiate the distribution index', async () => {
                distributionIndex = await getDistributionIndex();
                assert.equal(formatEther(distributionIndex), 100);
            }).timeout(1000000);

            it('should allocate 1st user with OZL tokens', async () => {
                assert.equal(await balanceOfOZL(callerAddr), 100.0);
            }).timeout(1000000);

            it('should allocate OZLDiamond with yvCrvTricrypto tokens', async () => {
                preYvCrvBalance = formatEther(await yvCrvTri.balanceOf(deployedDiamond.address));
                assert(preYvCrvBalance > 0);
            }).timeout(1000000);
        });

        describe('2nd user, 1st transfer / exchangeToUserToken()', async () => {
            it('should convert ETH to userToken (WBTC)', async () => {
                userDetails[0] = caller2Addr;
                userDetails[1] = wbtcAddr;

                await sendETH(userDetails); 
                assert(formatEther(await FRAX.balanceOf(callerAddr)) > 0);
            }).timeout(1000000);

            it('should re-calculate the distribution index', async () => {
                distributionIndex = await getDistributionIndex();
                assert.equal(formatEther(distributionIndex), 50);
            }).timeout(1000000);

            it('should distribute OZL tokens equally between users', async () => {
                assert.equal(await balanceOfOZL(callerAddr), 50.0);
                assert.equal(await balanceOfOZL(caller2Addr), 50.0);
            }).timeout(1000000);

            it('should add more yvCrvTricrypto tokens to OZLDiamond', async () => {
                currYvCrvBalance = formatEther(await yvCrvTri.balanceOf(deployedDiamond.address));
                assert(currYvCrvBalance > preYvCrvBalance);
            }).timeout(1000000);
        });

        describe('1st user, 2nd transfer / exchangeToUserToken', async () => {
            it('should convert ETH to userToken (MIM)', async () => {
                userDetails[0] = callerAddr;
                userDetails[1] = mimAddr;

                await sendETH(userDetails);
                assert(formatEther(await MIM.balanceOf(callerAddr)) > 0);
            }).timeout(1000000);
            
            it('should decrease the distribution index to its lowest level', async () => {
                newDistributionIndex = await getDistributionIndex();
                assert(newDistributionIndex < distributionIndex);
            }).timeout(1000000);

            it('should leave the first user with more OZL tokens than 2nd user', async () => {

                OZLbalanceFirstUser = await balanceOfOZL(callerAddr);
                OZLbalanceSecondUser = await balanceOfOZL(caller2Addr);
                assert(OZLbalanceFirstUser > OZLbalanceSecondUser);

                totalOZLusers = OZLbalanceFirstUser + OZLbalanceSecondUser;
                assert(totalOZLusers <= 100 && totalOZLusers >= 99.9);
            }).timeout(1000000);

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
                distributionIndex = await getDistributionIndex();

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