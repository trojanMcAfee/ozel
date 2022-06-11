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
let FRAX, WBTC;
let callerAddr, caller2Addr;
let distributionIndex;
let balance;
let deployedDiamond;
let preYvCrvBalance;


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
                assert.equal(formatEther(await balanceOfOZL(callerAddr)), 100.0);
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
                assert.equal(formatEther(await balanceOfOZL(callerAddr)), 50.0);
                assert.equal(formatEther(await balanceOfOZL(caller2Addr)), 50.0);
            }).timeout(1000000);

            it('should add more yvCrvTricrypto tokens to OZLDiamond', async () => {
                assert(formatEther(await yvCrvTri.balanceOf(deployedDiamond.address)) > preYvCrvBalance);
            }).timeout(1000000);
        });

        xit('should convert ETH to new userToken and modify dist. index / 2nd user 1st transfer / exchangeToUserToken()', async () => {
            userDetails[0] = caller2Addr;
            userDetails[1] = wbtcAddr;

            await sendETH(userDetails, 1); 
            distributionIndex = await getDistributionIndex();
            assert.equal(formatEther(distributionIndex), 50);

            balance = await WBTC.balanceOf(callerAddr);
            assert(Number(balance) / 10 ** 8 > 0);

            console.log('OZL balance on caller 2: ', formatEther(await balanceOfOZL(caller2Addr)));
            console.log('OZL balance on caller 1 after caller2 swap: ', formatEther(await balanceOfOZL(callerAddr)));
            console.log('yvCrvTricrypto token balance on diamondProxy: ', formatEther(await yvCrvTri.balanceOf(deployedDiamond.address)));



        });



    });







});