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



let userDetails;
let FRAX, MIM, USDT, USDC;
let callerAddr, caller2Addr;
let ozelIndex, newOzelIndex;
let balance, OZLbalanceFirstUser, OZLbalanceSecondUser, totalOZLusers;
let deployedDiamond;
let preYvCrvBalance, currYvCrvBalance;
let toTransfer, balanceMIM, yvCrvTri;


describe('Standard user interaction', async function () {
    this.timeout(1000000);

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
            fraxAddr, 
            defaultSlippage
        ];
    });

    
    

    describe('1st user, 1st transfer', async () => {
        it('should convert ETH to userToken (FRAX)', async () => {
            receipt = await sendETH(userDetails); 
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
});