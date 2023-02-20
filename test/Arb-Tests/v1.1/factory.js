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
let factory, ownerAddr, signer, signerAddr;

describe('v1.1 tests', async function () {
    this.timeout(1000000);

    before(async () => {
        ([ signer ] = await hre.ethers.getSigners());
        signerAddr = await signer.getAddress();

        accountDetails = [
            signerAddr,
            usdtAddrArb,
            defaultSlippage,
            'test'
        ];

        ownerAddr = '0xe738696676571D9b74C81716E4aE797c2440d306';
        ozlDiamondAddr = '0x7D1f13Dd05E6b0673DC3D0BFa14d40A74Cfa3EF2';
        ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);

        //Deploys the ProxyFactory in L2
        const Factory = await hre.ethers.getContractFactory('ozProxyFactoryFacet');
        factory = await Factory.deploy(pokeMeOpsAddr);
        await factory.deployed();
        console.log('ozProxyFactoryFacet deployed to: ', factory.address);

        //It adds it to ozDiamond
        ops.value = parseEther('3');
        ops.to = ownerAddr;
        await signer.sendTransaction(ops);
        delete ops.value;
        delete ops.to;

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

    describe('ozProxyFactoryFacet', async () => {
        it('should create a account successfully / createNewProxy()', async () => {
            await ozlDiamond.createNewProxy(accountDetails, ops);
            // ([ proxies, names ] = await storageBeacon.getAccountsByUser(signerAddr));

            // newProxyAddr = proxies[0].toString(); 
            // const name = names[0].toString();
            // assert.equal(newProxyAddr.length, 42);
            // assert(name.length > 0);
        });

        

    });


});