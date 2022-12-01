const { ethers } = require("ethers");
const assert = require('assert');
const { parseEther, formatEther } = ethers.utils;
require('dotenv').config();

const {
    balanceOfOZL, 
    transferOZL, 
    withdrawShareOZL, 
    getVarsForHelpers,
    sendETH,
    enableWithdrawals,
    deploy,
    getOzelIndex
} = require('../../scripts/helpers-arb.js');

const { 
    usdtAddrArb,
    wbtcAddr,
    usdcAddr,
    mimAddr,
    fraxAddr,
    defaultSlippage
} = require('../../scripts/state-vars.js');



let accountDetails;
let FRAX, MIM, USDT, USDC;
let callerAddr, caller2Addr;
let ozelIndex, newOzelIndex;
let balance, OZLbalanceFirstUser, OZLbalanceSecondUser, totalOZLusers;
let deployedDiamond;
let preYvCrvBalance, currYvCrvBalance;
let toTransfer, balanceMIM, yvCrvTri;



describe('Integration testing', async function () {
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

        accountDetails = [
            callerAddr,
            fraxAddr, 
            defaultSlippage,
            'myAccount'
        ];
    });

    
    /**
     * Since Curve doesn't have testnets, sendETH() sends ETH directly to
     * exchangeToAccountToken() which would simulate an Arbitrum L1 > L2 tx where
     * sendToArb() in L1 in ozPayMe would send the ETH to OZLFacet in L2,
     * 
     * Meant to be run as one test.
    */

    describe('1st user, 1st transfer', async () => {
        it('should convert ETH to token (FRAX)', async () => {
            receipt = await sendETH(accountDetails); 
            assert(formatEther(await FRAX.balanceOf(callerAddr)) > 0);
        });

        it('should initiate the Ozel index', async () => {
            ozelIndex = await getOzelIndex();
            assert.equal(Number(formatEther(ozelIndex)), 12000000);
        });

        it('should allocate 1st user with OZL tokens', async () => {
            assert.equal(await balanceOfOZL(callerAddr), 100.0);
        });

        it('should allocate OZLDiamond with yvCrvTricrypto tokens', async () => {
            preYvCrvBalance = formatEther(await yvCrvTri.balanceOf(deployedDiamond.address));
            assert(preYvCrvBalance > 0);
        });
    });

    describe('2nd user, 1st transfer', async () => {
        it('should convert ETH to token (WBTC)', async () => {
            accountDetails[0] = caller2Addr;
            accountDetails[1] = wbtcAddr;

            await sendETH(accountDetails); 
            assert(formatEther(await FRAX.balanceOf(callerAddr)) > 0);
        });

        it('should re-calculate the Ozel index', async () => {
            ozelIndex = await getOzelIndex();
            assert.equal(Number(formatEther(ozelIndex)), 6000000);
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

    describe('1st user, 2nd transfer', async () => {
        it('should convert ETH to token (MIM)', async () => {
            accountDetails[0] = callerAddr;
            accountDetails[1] = mimAddr;

            await sendETH(accountDetails);
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
        it("should have a balance of the dapp's fees on token (USDC)", async () => {
            await enableWithdrawals(true);
            accountDetails[1] = usdcAddr;
            await withdrawShareOZL(accountDetails, callerAddr, parseEther((await balanceOfOZL(callerAddr)).toString()));
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
            await sendETH(accountDetails);
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

        it("should have a balance of the dapp's fees on account token (USDT)", async () => {
            accountDetails[0] = caller2Addr;
            accountDetails[1] = usdtAddrArb;
            await withdrawShareOZL(accountDetails, caller2Addr, parseEther(toTransfer.toString()), 1);
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