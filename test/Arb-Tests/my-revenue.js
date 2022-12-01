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



let accountDetails, callerAddr, USDC;
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

        accountDetails = [
            callerAddr,
            fraxAddr, 
            defaultSlippage,
            'myAccount'
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

    afterEach(() => feesVaultFlag = true);


    it('should send the accrued revenue to the deployer in USDC / ComputeRevenueV1', async () => {
        balanceUSDC = await USDC.balanceOf(callerAddr) / 10 ** 6;
        assert.equal(balanceUSDC, 0);

        await replaceForModVersion('ComputeRevenueV1', false, selector, accountDetails);        
        receipt = await sendETH(accountDetails);

        testingNum = getTestingNumber(receipt);
        assert.equal(testingNum, 23);

        balanceUSDC = await USDC.balanceOf(callerAddr);
        assert(balanceUSDC / 10 ** 6 > 0);

        //Clean up
        await USDC.transfer(deadAddr, balanceUSDC); 
    }); 

    it('should send the accrued revenue to the deployer in tricrypto / ComputeRevenueV2', async () => {
        balanceTri = formatEther(await tricryptoCrv.balanceOf(callerAddr));
        assert.equal(balanceTri, 0);

        await replaceForModVersion('ComputeRevenueV2', false, selector, accountDetails, false, true);
       
        // feesVaultFlag = false;
        console.log('feesVaultFlag: ', feesVaultFlag);

        if (!feesVaultFlag) await sendETH(accountDetails);
        receipt = await sendETH(accountDetails);
        testingNum = getTestingNumber(receipt);
        assert.equal(testingNum, 23);

        balanceTri = await tricryptoCrv.balanceOf(callerAddr);
        assert(formatEther(balanceTri) > 0);

        //Clean up
        await tricryptoCrv.transfer(deadAddr, balanceTri);
    });

    xit('should send the accrued revenue to the deployer in USDC in two txs / ComputeRevenueV3', async () => {
        balanceUSDC = await USDC.balanceOf(callerAddr) / 10 ** 6;
        assert.equal(balanceUSDC, 0);

        await replaceForModVersion('ComputeRevenueV3', false, selector, accountDetails, false, true);
        
        if (!feesVaultFlag) await sendETH(accountDetails);
        receipt = await sendETH(accountDetails);
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

        await replaceForModVersion('ComputeRevenueV4', false, selector, accountDetails);
        
        if (!feesVaultFlag) await sendETH(accountDetails);
        receipt = await sendETH(accountDetails);
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

        if (!feesVaultFlag) await sendETH(accountDetails);
        ({ a, testingNum } = await replaceForModVersion('SwapWETHforRevenueV1', false, selector, accountDetails));
        assert.equal(testingNum, 23);

        balanceWETH = await WETH.balanceOf(callerAddr);
        assert(formatEther(balanceWETH) > 0);

        //Clean up
        await WETH.transfer(deadAddr, balanceWETH);
    });

    xit('should send the accrued revenue to deployer in revenueToken (USDC) at the 2nd attempt / SwapWETHforRevenueV2', async () => {
        balanceUSDC = await USDC.balanceOf(callerAddr);
        assert.equal(balanceUSDC / 10 ** 6, 0);

        if (!feesVaultFlag) await sendETH(accountDetails);
        await replaceForModVersion('SwapWETHforRevenueV2', false, selector, accountDetails);
        receipt = await sendETH(accountDetails);
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

        if (!feesVaultFlag) await sendETH(accountDetails);
        ({ testingNum } = await replaceForModVersion('SwapWETHforRevenueV3', false, selector, accountDetails));
        assert.equal(testingNum, 23);

        balanceUSDC = await USDC.balanceOf(callerAddr);
        assert(balanceUSDC / 10 ** 6 > 0);

        balanceWETH = await WETH.balanceOf(callerAddr);
        assert(formatEther(balanceWETH) > 0);
    });

    xit('should not call filterRevenueCheck / _filterRevenueCheck()', async () => {
        await replaceForModVersion('FilterRevenueCheckV1', false, selector, accountDetails, false, true);
        owner = await ozlDiamond.owner();
        assert.equal(owner, callerAddr);
    });
});