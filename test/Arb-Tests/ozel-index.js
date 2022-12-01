const { ethers } = require("ethers");
const assert = require('assert');
const { parseEther, formatEther } = ethers.utils;
require('dotenv').config();


const {
    balanceOfOZL, 
    getVarsForHelpers,
    sendETH,
    deploy,
    getOzelIndex,
    getRegulatorCounter,
    replaceForModVersion
} = require('../../scripts/helpers-arb.js');

const { 
    usdcAddr,
    fraxAddr,
    defaultSlippage,
    diamondABI
} = require('../../scripts/state-vars.js');



let accountDetails;
let callerAddr;
let ozelIndex;
let deployedDiamond;
let accounts, signers,regulatorCounter, higherIndex;
let iface, abi, selector;



/**
 * The test from below tests the stabilizing mechanism performed on updateIndex()
 * and balanceOf() which involves the main variable (Ozel Index) and its stabilizing
 * variables. 
 * 
 * It uses the ModExecutorFacet contract with hard-coded values in order to represent
 * a point in the future where the mechanism kicks in. 
 * 
 * The two main differences from the real implementation on ozExecutorFacet is on
 * line 133, 136 140 (from the Mod version) that uses much lower values in order to
 * show the workings of the mechanism.
 */

describe('Ozel Index', async function () { 
    this.timeout(100000000000000000000);

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

        abi = ['function updateExecutorState(uint256 amount_, address user_, uint256 lockNum_) external payable'];
        iface = new ethers.utils.Interface(abi);
        selector = iface.getSighash('updateExecutorState');
    });

    it('la la la', async () => {

        accounts = await hre.ethers.provider.listAccounts();
        const OZLDiamond = await hre.ethers.getContractAt(diamondABI, deployedDiamond.address);

        let signers;
        let value, tx, num;
        let one, two, three, four, five, six, seven, eight, nine, ten;
        let tOne, tTwo, tThree, tFour, tFive, tSix, tSeven, tEight, tNine, tThirty;


        for (let j=0; j < accounts.length; j++) {
            let acc = accounts[j];
            accountDetails[0] = acc;

            signers = await hre.ethers.getSigners();
            num = (j + 1) * 5 + 7;
            value = ethers.utils.parseEther(num.toString());
            tx = await OZLDiamond.connect(signers[j]).exchangeToAccountToken(accountDetails, {
                value,
                gasLimit: ethers.BigNumber.from('5000000'),
                gasPrice: ethers.BigNumber.from('40134698068')
            });
            await tx.wait();

            one = await balanceOfOZL(accounts[0]); 
            console.log(`balance of #0: `, one);

            two = await balanceOfOZL(accounts[1]); 
            console.log(`balance of #1: `, two);

            three = await balanceOfOZL(accounts[2]); 
            console.log(`balance of #2: `, three);

            four = await balanceOfOZL(accounts[3]); 
            console.log(`balance of #3: `, four);

            five = await balanceOfOZL(accounts[4]); 
            console.log(`balance of #4: `, five);

            six = await balanceOfOZL(accounts[5]); 
            console.log(`balance of #5: `, six);

            seven = await balanceOfOZL(accounts[6]); 
            console.log(`balance of #6: `, seven);

            eight = await balanceOfOZL(accounts[7]); 
            console.log(`balance of #7: `, eight);

            nine = await balanceOfOZL(accounts[8]); 
            console.log(`balance of #8: `, nine);

            ten = await balanceOfOZL(accounts[9]); 
            console.log(`balance of #9: `, ten);
            
            tOne = await balanceOfOZL(accounts[10]); 
            console.log(`balance of #10: `, tOne);

            tTwo = await balanceOfOZL(accounts[11]); 
            console.log(`balance of #11: `, tTwo);

            tThree = await balanceOfOZL(accounts[12]); 
            console.log(`balance of #12: `, tThree);

            tFour = await balanceOfOZL(accounts[13]); 
            console.log(`balance of #13: `, tFour);

            tFive = await balanceOfOZL(accounts[14]); 
            console.log(`balance of #14: `, tFive);

            tSix = await balanceOfOZL(accounts[15]); 
            console.log(`balance of #15: `, tSix);

            tSeven = await balanceOfOZL(accounts[16]); 
            console.log(`balance of #16: `, tSeven);

            tEight = await balanceOfOZL(accounts[17]); 
            console.log(`balance of #17: `, tEight);

            tNine = await balanceOfOZL(accounts[18]); 
            console.log(`balance of #18: `, tNine);

            tThirty = await balanceOfOZL(accounts[19]); 
            console.log(`balance of #19: `, tThirty);

            let total = one + two + three + four + five + six + seven + eight + nine + ten + tOne + tTwo + tThree + tFour + tFive + tSix + tSeven + tEight + tNine + tThirty;
            console.log('TOTAL: ', total);
            console.log(' ');
        }

        


    });

    xit('should successfully stabilize the index for OZL balances calculations / UpdateIndexV1 & balanceOf()', async () => {
        await replaceForModVersion('UpdateIndexV1', false, selector, accountDetails, false, true);
        
        accountDetails[1] = usdcAddr;
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
            accountDetails[0] = await signers[j].getAddress();

            await sendETH(accountDetails, j, 'ozel index test'); 

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
            assert(ozelIndex > 0 && Number(ozelIndex) <= Number(higherIndex));
            assert(regulatorCounter < 2 && regulatorCounter >= 0);
        }
    });
});