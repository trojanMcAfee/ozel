const { ethers } = require("ethers");
const assert = require('assert');
const { parseEther } = ethers.utils;

const { 
    balanceOfOZL, 
    getVarsForHelpers,
    getAccData,
    deployV1_1,
    sendETHOps
} = require('../../../scripts/helpers-arb');

const { createProxy } = require('../../../scripts/helpers-eth');

const { 
    usdtAddrArb,
    defaultSlippage,
    diamondABI,
    ops
} = require('../../../scripts/state-vars');


let ozlDiamondAddr, ozlDiamond;
let signer, signerAddr;
let tx, accData;
let beacon, ozMiddleware;


/**
 * Tests integration of the upgrade with the deployed contracts in L2.
 */
describe('With deployed OZL', async () => {
    this.timeout(1000000);

    before(async () => {
        ozlDiamondAddr = '0x7D1f13Dd05E6b0673DC3D0BFa14d40A74Cfa3EF2';
        deployer2 = '0xe738696676571D9b74C81716E4aE797c2440d306';
        testAcc2 = '0x9c1241606DafbAeE46dFAdF3B0deCd0B653f342e';
        testAcc = '0xc4D53D620d2ce9f0DE3eC241d4B74DD36A2989a1';
        ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);
        signerAddr = testAcc;
        ([ signer ] = await hre.ethers.getSigners());

        /**
         * Deploys v1.1 upgrade
         */
        ([ ozMiddleware, beacon ] = await deployV1_1(ozlDiamond, deployer2));

        /**
         * Internal config so the test succeeds
         */
        accData = getAccData(testAcc, usdtAddrArb, defaultSlippage);
        getVarsForHelpers(ozlDiamond, '');
        await sendETHOps('11', deployer2);

        accountDetails = [
            signerAddr,
            usdtAddrArb,
            defaultSlippage,
            'test'
        ];
    });

    it('should properly calculate new Ozel balances in an L1 user after having used an L2 Account', async () => {
        /**
         * Calculates OZL balances pre-tx
         */
        console.log('');
        const ozlBalanceTestAcc2Pre = await balanceOfOZL(testAcc2);
        console.log('OZL balance account1 pre-tx: ', ozlBalanceTestAcc2Pre);

        const ozlBalanceTestAccPre = await balanceOfOZL(testAcc);
        console.log('OZL balance account2 pre-tx: ', ozlBalanceTestAccPre);

        let totalOZL = ozlBalanceTestAcc2Pre + ozlBalanceTestAccPre;
        console.log('total OZL balance: ', totalOZL);
        assert(totalOZL > 99.99 && totalOZL < 100);

        const USDT = await hre.ethers.getContractAt('IERC20', usdtAddrArb);
        const balanceUSDTpre = await USDT.balanceOf(testAcc);
        console.log('USDT balance account2 pre-tx: ', balanceUSDTpre / 10 ** 6);
        assert.equal(Number(balanceUSDTpre), 0);

        console.log('');
        console.log('***** ETH sent to account2 *****');
        console.log('');

        /**
         * Sends tx to ozDiamond that will trigger a re-calculation of OZL balances
         */
        newProxyAddr = await createProxy(ozlDiamond, accountDetails);
        const value = parseEther('1');
        ops.value = value;
        ops.to = newProxyAddr;
        tx = await signer.sendTransaction(ops);
        await tx.wait();

        /**
         * Re-calculates OZL balances and checks that the owner of 
         * the receiving Account got their stablecoins (USDT in this case)
         */
        const ozlBalanceTestAcc2Post = await balanceOfOZL(testAcc2);
        console.log('OZL balance account1 post-tx: ', ozlBalanceTestAcc2Post);
        assert(ozlBalanceTestAcc2Post < ozlBalanceTestAcc2Pre);

        const ozlBalanceTestAccPost = await balanceOfOZL(testAcc);
        console.log('OZL balance account2 post-tx: ', ozlBalanceTestAccPost);
        assert(ozlBalanceTestAccPost > ozlBalanceTestAccPre);

        totalOZL = ozlBalanceTestAcc2Post + ozlBalanceTestAccPost;
        console.log('total OZL balance: ', totalOZL);
        assert(totalOZL > 99.99 && totalOZL < 100);

        const balanceUSDTpost = await USDT.balanceOf(testAcc);
        console.log('USDT balance account2 post-tx: ', balanceUSDTpost / 10 ** 6);
        assert(Number(balanceUSDTpost) > 1600);
    });
});