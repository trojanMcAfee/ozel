const assert = require('assert');

const { 
    getVarsForHelpers,
    deployV1_2,
    addTokenToDatabaseAsOwner,
    removeTokenFromDatabaseAsOwner,
    removeTokenFromDatabase,
    changeL1CheckAsOwner,
    addTokenToDatabase
} = require('../../../scripts/helpers-arb');

const { err } = require('../../errors');

const { 
    usdtAddrArb,
    diamondABI,
    ops,
    tokensDatabaseL1,
    usxAddr,
    dForcePoolAddr,
    nullAddr,
    usdcAddr,
    crv2PoolAddr
} = require('../../../scripts/state-vars');
const { ethers } = require('hardhat');


let tokens, tokenSwap, token;
let signer, signerAddr, newOzlFacet;


describe('With deployed Ozel', async function () {
    this.timeout(1000000);

    before(async () => {
        ozlDiamondAddr = '0x7D1f13Dd05E6b0673DC3D0BFa14d40A74Cfa3EF2';
        testAcc2 = '0x9c1241606DafbAeE46dFAdF3B0deCd0B653f342e';
        testAcc = '0xc4D53D620d2ce9f0DE3eC241d4B74DD36A2989a1';
        ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);
        ([ signer ] = await hre.ethers.getSigners());
        signerAddr = await signer.getAddress();

        newOzlFacet = await deployV1_2(ozlDiamond);

        getVarsForHelpers(ozlDiamond, '');

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

    it('should get the tokens database array / getTokenDatabase()', async () => {
        tokens = await ozlDiamond.getTokenDatabase();
        assert.equal(tokens.length, 5);
    });

    it('should add a new token to the database and check the array of L2 addresses / addTokenToDatabase()', async () => {
        tokens = await ozlDiamond.getTokenDatabase();
        assert.equal(tokens.length, 5);
       
        await addTokenToDatabaseAsOwner(tokenSwap, token);

        tokens = await ozlDiamond.getTokenDatabase();
        assert.equal(tokens.length, 6);
    });

    it('should remove a token from the database and chek the array of L2 addresses / removeTokenFromDatabase()', async () => {
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

    it('should not allow an unauthorized user to remove a token (USX) from the database / removeTokenFromDatabase()', async () => {
        await assert.rejects(async () => {
            await removeTokenFromDatabase(tokenSwap, token, 1);
        }, {
            name: 'Error',
            message: (await err(2)).notAuthorized 
        });
    });

    it('should not allow an external user add a new token to the database / addTokenToDatabase()', async () => {
        await assert.rejects(async () => {
            await addTokenToDatabase(tokenSwap, token);
        }, {
            name: 'Error',
            message: (await err(2)).notAuthorized 
        });
    });

    it('should not allow to add a new token with an L1 address when the l1Check has been disabled / addTokenToDatabase() - changeL1Check()', async () => {
        await changeL1CheckAsOwner(false);

        tokenSwap = [
            1,
            0,
            usdtAddrArb,
            usdcAddr,
            crv2PoolAddr
        ];
        token = [ tokensDatabaseL1.usdcAddr, usdcAddr ];
        await removeTokenFromDatabaseAsOwner(tokenSwap, token, ops);
        
        await assert.rejects(async () => {
            await addTokenToDatabaseAsOwner(tokenSwap, token);
        }, {
            name: 'Error',
            message: (await err(token[0])).l1TokenDisabled 
        });
    });

    it('checks that the OZLFacet methods were successfully replaced', async () => {
        const iface = new ethers.utils.Interface(diamondABI);
        const selecAdd = iface.getSighash('addTokenToDatabase');
        const selecRemove = iface.getSighash('removeTokenFromDatabase');
        const newOzlFacetLower = newOzlFacet.toLowerCase();
        
        const facet1 = (await ozlDiamond.facetAddress(selecAdd)).toLowerCase();
        const facet2 = (await ozlDiamond.facetAddress(selecRemove)).toLowerCase();

        assert(newOzlFacetLower == facet1 && newOzlFacetLower == facet2);
    });
});