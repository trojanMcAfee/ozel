const { ethers } = require("ethers");
const assert = require('assert');
const { parseEther } = ethers.utils;

const { 
    balanceOfOZL, 
    getVarsForHelpers,
    getAccData,
    deployV1_1,
    sendETHOps,
    deployV1_2,
    addTokenToDatabaseAsOwner,
    removeTokenFromDatabaseAsOwner
} = require('../../../scripts/helpers-arb');

const { createProxy } = require('../../../scripts/helpers-eth');

const { 
    usdtAddrArb,
    defaultSlippage,
    diamondABI,
    ops,
    tokensDatabaseL1,
    usxAddr,
    dForcePoolAddr,
    nullAddr
} = require('../../../scripts/state-vars');


let tokens, tokenSwap, token;
let signer, signerAddr;


describe('With deployed Ozel', async function () {
    this.timeout(1000000);

    before(async () => {
        ozlDiamondAddr = '0x7D1f13Dd05E6b0673DC3D0BFa14d40A74Cfa3EF2';
        testAcc2 = '0x9c1241606DafbAeE46dFAdF3B0deCd0B653f342e';
        testAcc = '0xc4D53D620d2ce9f0DE3eC241d4B74DD36A2989a1';
        ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);
        ([ signer ] = await hre.ethers.getSigners());
        signerAddr = await signer.getAddress();

        await deployV1_2(ozlDiamond);

        //dForcePool --> USX: 0 / USDT: 2 / USDC: 1
        tokenSwap = [
            2,
            0,
            usdtAddrArb,
            usxAddr,
            dForcePoolAddr
        ];

        token = [ nullAddr, usxAddr ];
    });

    xit('should get the tokens database array / getTokenDatabase()', async () => {
        tokens = await ozlDiamond.getTokenDatabase();
        assert.equal(tokens.length, 5);
    });

    xit('should add a new token to the database and check the array of L2 addresses / addTokenToDatabase()', async () => {
        tokens = await ozlDiamond.getTokenDatabase();
        assert.equal(tokens.length, 5);
       
        await addTokenToDatabaseAsOwner(tokenSwap, token);

        tokens = await ozlDiamond.getTokenDatabase();
        assert.equal(tokens.length, 6);
    });

    xit('should remove a token from the database and chek the array of L2 addresses / removeTokenFromDatabase()', async () => {
        tokens = await ozlDiamond.getTokenDatabase();
        if (tokens.length === 5) {
            await addTokenToDatabaseAsOwner(tokenSwap, token);
            tokens = await ozlDiamond.getTokenDatabase();
        }
        assert.equal(tokens.length, 6);
       
        await removeTokenFromDatabaseAsOwner(tokenSwap, token);

        tokens = await ozlDiamond.getTokenDatabase();
        assert.equal(tokens.length, 5);
    });

    //doing the should not tests

});