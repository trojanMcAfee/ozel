const { ethers } = require("ethers");
const assert = require('assert');
const { formatEther } = ethers.utils;

const { 
    getVarsForHelpers,
    deploy,
    getAccData,
    deployV1_1
} = require('../../../scripts/helpers-arb');


const { 
    createProxy, 
    sendETH,
} = require('../../../scripts/helpers-eth');

const { 
    usdtAddrArb,
    defaultSlippage,
    diamondABI,
    wbtcAddr
} = require('../../../scripts/state-vars');



let ozlDiamond, newProxyAddr;
let signer, signerAddr;
let balance, accData;
let signers, signerAddr2, beacon, ozMiddleware;


/**
 * Tests that the OZL balance is being successfully re-calculated
 * between L1 and L2 interactions.
 */
describe('OZL balance', async function () {
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
        ([signerAddr, signerAddr2 ] = await hre.ethers.provider.listAccounts());

        accData = getAccData(callerAddr, usdtAddrArb, defaultSlippage);

        accountDetails = [
            signerAddr,
            usdtAddrArb,
            defaultSlippage,
            'test'
        ];

        accountDetails[0] = signerAddr;
        newProxyAddr = await createProxy(ozlDiamond, accountDetails);

        const undoAliasAddrOzMiddleL2 = '0x3b4759f0f772848b2d91f1d83e2fe57935346f18';
        tx = await ozlDiamond.setAuthorizedCaller(undoAliasAddrOzMiddleL2, true);
        await tx.wait();
    });

    /**
     * This test is meant to be ran as one.
     */
    describe('With new accounts', async () => {
        it('should correctly calculate OZL balance for an user when using an L2 Account', async () => {
            balance = await ozlDiamond.balanceOf(signerAddr);
            assert.equal(formatEther(balance), 0);

            await sendETH(newProxyAddr, 0.1);
            
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

            await sendETH(newProxyAddr, 0.1);
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