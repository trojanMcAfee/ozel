const { ethers } = require("ethers");
const assert = require('assert');
const { formatEther } = ethers.utils;
require('dotenv').config();


const { 
    getVarsForHelpers,
    sendETH,
    deploy,
    getTestingNumber,
    replaceForModVersion
} = require('../../scripts/helpers-arb.js');

const { 
    fraxAddr,
    defaultSlippage,
    deadAddr,
    crvTricrypto,
    diamondABI
} = require('../../scripts/state-vars.js');



let userDetails, callerAddr, USDC;
let deployedDiamond, receipt;
let iface, abi;
let selector, balanceWETH;
let testingNum, balanceUSDC, balanceTri;
let ozlDiamond, owner, feesVaultFlag;



/**
 * Tests the anti-slippage system used in RevenueFacet.sol
 */
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
        tricryptoCrv = await hre.ethers.getContractAt('IERC20', crvTricrypto);

        //Clean up from past tests
        balanceUSDC = await USDC.balanceOf(callerAddr);
        await USDC.transfer(deadAddr, balanceUSDC);

        ozlDiamond = await hre.ethers.getContractAt(diamondABI, deployedDiamond.address);

        balanceWETH = await WETH.balanceOf(callerAddr);
        await WETH.transfer(deadAddr, balanceWETH);
    });


    xit('should send the accrued revenue to the deployer in USDC / ComputeRevenueV1', async () => {
        balanceUSDC = await USDC.balanceOf(callerAddr) / 10 ** 6;
        assert.equal(balanceUSDC, 0);

        ({ a, b, c, modContract} = await replaceForModVersion('ComputeRevenueV1', false, selector, userDetails));        
        receipt = await sendETH(userDetails);

        testingNum = getTestingNumber(receipt);
        assert.equal(testingNum, 23);

        balanceUSDC = await USDC.balanceOf(callerAddr);
        assert(balanceUSDC / 10 ** 6 > 0);

        //Cleans up
        await USDC.transfer(deadAddr, balanceUSDC); 
        feesVaultFlag = true;

    }); 

    it('should send the accrued revenue to the deployer in tricrypto / ComputeRevenueV2', async () => {
        console.log(1);
        balanceTri = formatEther(await tricryptoCrv.balanceOf(callerAddr));
        assert.equal(balanceTri, 0);
        console.log(2);

        await replaceForModVersion('ComputeRevenueV2', false, selector, userDetails, false, true);
        console.log(3);
       
        if (!feesVaultFlag) await sendETH(userDetails);
        receipt = await sendETH(userDetails);
        console.log(4);
        testingNum = getTestingNumber(receipt);
        console.log(5);
        assert.equal(testingNum, 23);

        console.log(6);
        balanceTri = await tricryptoCrv.balanceOf(callerAddr);
        console.log(7);
        assert(formatEther(balanceTri) > 0);
        console.log(8);

        //Clean up
        await tricryptoCrv.transfer(deadAddr, balanceTri);
        console.log(9);

    });

    xit('should send the accrued revenue to the deployer in USDC in two txs / ComputeRevenueV3', async () => {
        balanceUSDC = await USDC.balanceOf(callerAddr) / 10 ** 6;
        assert.equal(balanceUSDC, 0);

        await replaceForModVersion('ComputeRevenueV3', false, selector, userDetails, false, true);
        
        receipt = await sendETH(userDetails);
        testingNum = getTestingNumber(receipt);
        assert.equal(testingNum, 23);

        balanceUSDC = await USDC.balanceOf(callerAddr);
        assert(balanceUSDC / 10 ** 6 > 0);

        //Clean up
        await USDC.transfer(deadAddr, balanceUSDC);
    });

    xit('should send the accrued revenue to the deployer in tricrypto and WETH / ComputeRevenueV4', async () => {
        balanceWETH = await WETH.balanceOf(callerAddr);
        assert.equal(formatEther(balanceWETH), 0);
        balanceTri = await tricryptoCrv.balanceOf(callerAddr);
        assert.equal(formatEther(balanceTri), 0);

        await replaceForModVersion('ComputeRevenueV4', false, selector, userDetails);
        receipt = await sendETH(userDetails);

        testingNum = getTestingNumber(receipt);
        assert.equal(testingNum, 23);

        balanceWETH = await WETH.balanceOf(callerAddr);
        assert(formatEther(balanceWETH) > 0);
        balanceTri = await tricryptoCrv.balanceOf(callerAddr);
        assert(formatEther(balanceTri) > 0);

        //Clean up
        await WETH.transfer(deadAddr, balanceWETH);
    });

    xit('should send the accrued revenue to deployer in WETH / SwapWETHforRevenueV1', async () => {
        balanceWETH = await WETH.balanceOf(callerAddr);
        assert.equal(formatEther(balanceWETH), 0); 

        ({ a, testingNum } = await replaceForModVersion('SwapWETHforRevenueV1', false, selector, userDetails));
        assert.equal(testingNum, 23);

        balanceWETH = await WETH.balanceOf(callerAddr);
        assert(formatEther(balanceWETH) > 0);

        //Clean up
        await WETH.transfer(deadAddr, balanceWETH);
    });

    xit('should send the accrued revenue to deployer in revenueToken (USDC) at the 2nd attempt / SwapWETHforRevenueV2', async () => {
        balanceUSDC = await USDC.balanceOf(callerAddr);
        assert.equal(balanceUSDC / 10 ** 6, 0);

        await replaceForModVersion('SwapWETHforRevenueV2', false, selector, userDetails);
        receipt = await sendETH(userDetails);
        testingNum = getTestingNumber(receipt);
        assert.equal(testingNum, 23);

        balanceUSDC = await USDC.balanceOf(callerAddr);
        assert(balanceUSDC / 10 ** 6 > 0);

        //Clean up
        await USDC.transfer(deadAddr, balanceUSDC);
    });

    xit('should send the accrued revenue to deployer in both USDC and WETH / SwapWETHforRevenueV3', async () => {
        balanceUSDC = await USDC.balanceOf(callerAddr);
        assert.equal(balanceUSDC / 10 ** 6, 0);

        balanceWETH = await WETH.balanceOf(callerAddr);
        assert.equal(formatEther(balanceWETH), 0); 

        ({ testingNum } = await replaceForModVersion('SwapWETHforRevenueV3', false, selector, userDetails));
        assert.equal(testingNum, 23);

        balanceUSDC = await USDC.balanceOf(callerAddr);
        assert(balanceUSDC / 10 ** 6 > 0);

        balanceWETH = await WETH.balanceOf(callerAddr);
        assert(formatEther(balanceWETH) > 0);
    });

    xit('should not call filterRevenueCheck / _filterRevenueCheck()', async () => {
        await replaceForModVersion('FilterRevenueCheckV1', false, selector, userDetails, false, true);
        owner = await ozlDiamond.owner();
        assert.equal(owner, callerAddr);
    });
});