const { ethers } = require("ethers");
const assert = require('assert');
const { formatEther } = ethers.utils;
require('dotenv').config();


const {
    getVarsForHelpers,
    sendETH,
    deploy,
    getTestingNumber,
    replaceForModVersion,
    getAccData
} = require('../../scripts/helpers-arb.js');

const { 
    defaultSlippage,
    tokensDatabaseL1,
    deadAddr
} = require('../../scripts/state-vars.js');



let accountDetails;
let MIM, USDT;
let callerAddr, caller2Addr;
let deployedDiamond;
let iface, abi, receipt;
let selector, balanceWETH, balanceUSDT, balanceMIM;
let testingNum;



/**
 * It tests the anti-slippage system designed with try/catch blocks on the contracts
 * OZLFacet and ozExecutorFacet.
 * 
 * It uses the functions from TestingFunctions.sol
 */
describe('Anti-slippage system', async function () {
    this.timeout(1000000);

    before( async () => {
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

        // accountDetails = [ 
        //     callerAddr,
        //     tokensDatabaseL1.usdtAddr,
        //     defaultSlippage,
        //     'myAccount'
        // ];
        accountDetails = getAccData(callerAddr, tokensDatabaseL1.usdtAddr, defaultSlippage);

        abi = ['function exchangeToAccountToken(bytes,uint256,address) external payable'];
        iface = new ethers.utils.Interface(abi);
        selector = iface.getSighash('exchangeToAccountToken');
    });

    describe('Modified OZLFacet', async () => {

        /** 
         * Changed the first slippage for type(uint).max in _swapsForBaseToken 
         * in order to provoke all trades to fail (due to slippage) and invoke
         * the last resort mechanism (send WETH back to user)
         */ 
        xit('should replace swapsUserToken for V1 / SwapsForUserTokenV1', async () => {            
            ({ testingNum, balance: balanceWETH } = await replaceForModVersion('SwapsForUserTokenV1', true, selector, accountDetails, true));
            assert(formatEther(balanceWETH) > 0);  
            assert.equal(testingNum, 23);
        });


        /**
         * Added a condition so it failes the first attempt due to slippage
         * but makes the trade in the second.
         */
        xit('should replace swapsUserToken for V2 / SwapsForUserTokenV2', async () => {            
            ({ testingNum, balance: balanceUSDT } = await replaceForModVersion('SwapsForUserTokenV2', true, selector, accountDetails));
            assert.equal(testingNum, 23);
            assert(balanceUSDT / 10 ** 6 > 0);

        });

        /**
         * Added a 2nd testVar that causes the 3rd swap attempt to fail. The 2nd
         * swap exchanged half of amountIn to token, and due to the failure on
         * the 3rd swap, the other half of amountIn was sent as WETH back to the user.
         */
        xit('should replace swapsUserToken for V3 / SwapsForUserTokenV3', async () => {            
            balanceUSDTpre = (await USDT.balanceOf(callerAddr)) / 10 ** 6;
            balanceWETHpre = formatEther(await WETH.balanceOf(callerAddr));

            ({ testingNum, balance: balanceWETH } = await replaceForModVersion('SwapsForUserTokenV3', false, selector, accountDetails, true));
            balanceWETH = formatEther(balanceWETH);
            halfInitialTransferInUSDT = 255000 / 2;
            halfInitialTransferInWETH = 100 / 2;

            halfInitialTransferInUSDTWithSlippage = halfInitialTransferInUSDT + (halfInitialTransferInUSDT / defaultSlippage);

            balanceUSDTpost = (await USDT.balanceOf(callerAddr)) / 10 ** 6;
            balanceUSDTdiff = balanceUSDTpost - balanceUSDTpre;
            balanceWETHdiff = balanceWETH - balanceWETHpre;

            assert.equal(testingNum, 23);
            assert(
                balanceUSDTdiff > 0 && 
                ( balanceUSDTdiff < halfInitialTransferInUSDT || 
                    balanceUSDTdiff > halfInitialTransferInUSDT && balanceUSDTdiff < halfInitialTransferInUSDTWithSlippage )
            );
            assert(balanceWETHdiff > 0 && balanceWETHdiff < halfInitialTransferInWETH);
        });

        /**
         * Changed the slipppage amount for a type(uint).max condition so depositing
         * the dapp's fees failes and stores the fees into its own variable, which
         * are attempted to be deposited once again through any main action from
         * the app (deposit - withdraw).
         */
        it('should add failed fees to its own variable / DepositFeesInDeFiV1', async () => {            
            ({ testingNum } = await replaceForModVersion('DepositFeesInDeFiV1', false, selector, accountDetails));
            assert.equal(testingNum, 23);
        });

        /**
         * It deposits -in DeFi- the failedFees that weren't deposited in the prior test.
         */
        xit('should deposit any failed fees found in the failedFees variable / DepositFeesInDeFiV1', async () => {            
            await replaceForModVersion('DepositFeesInDeFiV1', false, selector, accountDetails);
            receipt = await sendETH(accountDetails);
            assert.equal(getTestingNumber(receipt, true), 24);

            //Reverts to the original _depositFeesInDeFi()
            await replaceForModVersion(ozlFacet, false, selector, accountDetails, false, true);
        });
    });


    xdescribe('Modified ozExecutorFacet', async () => {
        before( async () => {
            abi = ['function executeFinalTrade((int128 tokenIn, int128 tokenOut, address baseToken, address token, address pool) swapDetails_, uint256 userSlippage_, address user_, uint256 lockNum_) external payable'];
            iface = new ethers.utils.Interface(abi);
            selector = iface.getSighash('executeFinalTrade');
            accountDetails[1] = tokensDatabaseL1.usdcAddr;

            balanceUSDT = await USDT.balanceOf(callerAddr);
            balanceUSDC = await USDC.balanceOf(callerAddr);
            if (Number(balanceUSDT) > 0) await USDT.transfer(deadAddr, balanceUSDT);
            if (Number(balanceUSDC) > 0) await USDC.transfer(deadAddr, balanceUSDC);
        });

        /**
         * Changed slippage to type(uint).max in order to fail all trades and activate the last path
         */
        it("should send the funds to the user in their account token's swap's baseToken / ExecutorFacetV1", async () => {            
            balanceUSDT = await USDT.balanceOf(callerAddr);
            assert.equal(balanceUSDT / 10 ** 8, 0);

            ({ testingNum, balance: balanceUSDT } = await replaceForModVersion('ExecutorFacetV1', false, selector, accountDetails, false));
            balanceUSDC = (await USDC.balanceOf(callerAddr)) / 10 ** 8;
            assert.equal(testingNum, 23);
            
            assert(balanceUSDT / 10 ** 8 > 0);
            assert.equal(balanceUSDC, 0);

            //Clean up
            await USDT.transfer(caller2Addr, balanceUSDT);
        });

        /**
         * Added an slippage condition so it fails the 1st attempt and activates the slippage mechanism.
         * All funds are in account token through two swaps
         */
        it('should send the account token to the user in the 2nd loop iteration / ExecutorFacetV2', async () => {            
            balanceUSDC = (await USDC.balanceOf(callerAddr)) / 10 ** 8;
            assert.equal(balanceUSDC, 0);

            ({ testingNum, balance: balanceUSDC } = await replaceForModVersion('ExecutorFacetV2', false, selector, accountDetails, 3));
            assert.equal(testingNum, 23);

            balanceUSDC = await USDC.balanceOf(callerAddr);
            assert(balanceUSDC / 10 ** 8 > 0);
            await USDC.transfer(caller2Addr, balanceUSDC);
        });


        /**
         * Fails the 1st and 3rd swapping attempts so half of the user's funds are traded in account token
         * and the other half in the baseToken.
         */
        it('should divide the funds between baseToken and account token / ExecutorFacetV3', async () => {            
            balanceUSDC = (await USDC.balanceOf(callerAddr)) / 10 ** 8;
            assert(balanceUSDC < 0.000001);

            balanceUSDT = (await USDT.balanceOf(callerAddr)) / 10 ** 8;
            assert.equal(balanceUSDT, 0);

            ({ testingNum, balance: balanceUSDC, receipt } = await replaceForModVersion('ExecutorFacetV3', false, selector, accountDetails, 5));
            assert.equal(testingNum, 23);

            testingNum = getTestingNumber(receipt, true);
            assert.equal(testingNum, 24);

            balanceUSDT = await USDT.balanceOf(callerAddr);
            assert(balanceUSDC / 10 ** 8 > 0);
            assert(balanceUSDT / 10 ** 8 > 0);
        }); 


        /**
         * Changed slippage to type(uint).max in order to fail all trades and activate the last path
         * (2nd leg for non-BTC-2Pool coins)
         */
        it('should swap the funds to account token only / ExecutorFacetV4', async () => {            
            accountDetails[1] = tokensDatabaseL1.mimAddr;
            ({ testingNum, balance: balanceUSDT } = await replaceForModVersion('ExecutorFacetV4', false, selector, accountDetails, false));
            assert.equal(testingNum, 23);
            assert(balanceUSDT > 0);
            await USDT.transfer(caller2Addr, balanceUSDT);
        });


        /**
         * Added an slippage condition so it fails the 1st attempt and activates the slippage mechanism.
         * All funds are in account token through two swaps (2nd leg for non-BTC-2Pool coins)
         */
        it('should send account token to the user in the 2nd loop iteration / ExecutorFacetV5', async () => {
            accountDetails[1] = tokensDatabaseL1.mimAddr;
            balanceMIM = formatEther(await MIM.balanceOf(callerAddr));
            assert.equal(balanceMIM, 0);

            ({ testingNum, balance: balanceMIM } = await replaceForModVersion('ExecutorFacetV5', false, selector, accountDetails, 3));
            assert.equal(testingNum, 23);
            assert(formatEther(balanceMIM) > 0);

            await MIM.transfer(caller2Addr, balanceMIM);
        });


        /**
         * Fails the 1st and 3rd swapping attempts so half of the user's funds are traded in account token
         * and the other half in the baseToken.
         */
        it('should divide the funds between baseToken and account token / ExecutorFacetV6', async () => {            
            accountDetails[1] = tokensDatabaseL1.mimAddr;
            balanceMIM = formatEther(await MIM.balanceOf(callerAddr));
            assert.equal(balanceMIM, 0);

            balanceUSDT = (await USDT.balanceOf(callerAddr)) / 10 ** 6;
            assert.equal(balanceUSDT, 0);

            ({ testingNum, balance: balanceMIM } = await replaceForModVersion('ExecutorFacetV6', false, selector, accountDetails, 3));
            assert.equal(testingNum, 23);
            assert(formatEther(balanceMIM) > 0);

            balanceUSDT = (await USDT.balanceOf(callerAddr)) / 10 ** 6;
            assert(balanceUSDT > 0);
        });
    });
});