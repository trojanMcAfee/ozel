const { ethers } = require("ethers");
const assert = require('assert');
const { parseEther, formatEther } = ethers.utils;


const { err } = require('../../errors'); 

const { 
    balanceOfOZL, 
    transferOZL, 
    withdrawShareOZL, 
    getVarsForHelpers,
    sendETH,
    enableWithdrawals,
    deploy,
    getOzelIndex,
    addTokenToDatabase,
    getRegulatorCounter,
    getTestingNumber,
    replaceForModVersion,
    queryTokenDatabase,
    removeTokenFromDatabase,
    getAccData,
    sendETHWithAlias
} = require('../../../scripts/helpers-arb');

const { getSelectors } = require('../../../scripts/myDiamondUtil');

const { 
    usdtAddrArb,
    defaultSlippage,
    nullAddr,
    deadAddr,
    crvTricrypto,
    diamondABI,
    usxAddr,
    dForcePoolAddr,
    ops,
    protocolFee,
    tokensDatabaseL1,
    usdcAddr,
    crv2PoolAddr,
    pokeMeOpsAddr
} = require('../../../scripts/state-vars');


let ozlDiamondAddr, ozlDiamond;
let factory, ownerAddr, signer;

describe('v1.1 tests', async function () {
    this.timeout(1000000);

    before(async () => {
        ownerAddr = '0xe738696676571D9b74C81716E4aE797c2440d306';
        ozlDiamondAddr = '0x7D1f13Dd05E6b0673DC3D0BFa14d40A74Cfa3EF2';
        ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);

        const Factory = await hre.ethers.getContractFactory('ozProxyFactoryFacet');
        factory = await Factory.deploy(pokeMeOpsAddr);
        await factory.deployed();
        console.log('ozProxyFactoryFacet deployed to: ', factory.address);
    });

    describe('ozProxyFactoryFacet', async () => {

        it('add the factory to ozDiamond', async () => {
            [ signer ] = await hre.ethers.getSigners();

            await hre.network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [ownerAddr],
            });
        
            const ownerSigner = await hre.ethers.provider.getSigner(ownerAddr);
            const facetCut = [[ factory.address, 0, getSelectors(factory) ]];
            await ozlDiamond.connect(ownerSigner).diamondCut(facetCut, nullAddr, '0x');

            await hre.network.provider.request({
                method: "hardhat_stopImpersonatingAccount",
                params: [ownerAddr],
            });
        });

        

    });


});