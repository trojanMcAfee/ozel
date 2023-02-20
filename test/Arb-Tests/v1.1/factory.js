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
    sendETHWithAlias,
    deployFacet
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
let ownerAddr, signer, signerAddr;

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
        const factory = await Factory.deploy(pokeMeOpsAddr);
        await factory.deployed();
        console.log('ozProxyFactoryFacet deployed to: ', factory.address);

        //Deploys ozLoupeFacetV1_1 in L2
        const newLoupe = await deployFacet('ozLoupeFacetV1_1');

        //Adds them to ozDiamond
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
        const facetCut = [
            [ factory.address, 0, getSelectors(factory) ],
            [ newLoupe.address, 0, getSelectors(newLoupe) ]
        ];
        await ozlDiamond.connect(ownerSigner).diamondCut(facetCut, nullAddr, '0x');

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [ownerAddr],
        });

    });

    describe('ozProxyFactoryFacet', async () => {
        it('should create a account successfully / createNewProxy()', async () => {
            await ozlDiamond.createNewProxy(accountDetails, ops);
            ([ proxies, names ] = await ozlDiamond.getAccountsByUser(signerAddr));

            newProxyAddr = proxies[0].toString(); 
            const name = names[0].toString();
            assert.equal(newProxyAddr.length, 42);
            assert(name.length > 0);
        });

        it('should not allow to create a account witn an empty account name / createNewProxy()', async () => {
            accountDetails[3] = '';
            await assert.rejects(async () => {
                await ozlDiamond.createNewProxy(accountDetails, ops);
            }, {
                name: 'Error',
                message: (await err()).zeroName 
            });

            //Clean up
            accountDetails[3] = 'my account';
        });

        it('should not allow to create a account with a name with more of 18 characters / createNewProxy()', async () => {
            const invalidName = 'fffffffffffffffffff';
            assert(invalidName.length > 18);
            accountDetails[3] = invalidName;

            await assert.rejects(async () => {
                await ozlDiamond.createNewProxy(accountDetails, ops);
            }, {
                name: 'Error',
                message: (await err()).invalidName 
            });

            //Clean up
            accountDetails[3] = 'my account';
        });

        it('should not allow to create a account with the 0 address / createNewProxy()', async () => {
            accountDetails[1] = nullAddr;
            await assert.rejects(async () => {
                await ozlDiamond.createNewProxy(accountDetails, ops);
            }, {
                name: 'Error',
                message: (await err()).zeroAddress 
            });
        });

        it('should not allow to create a account with 0 slippage / createNewProxy()', async () => {
            accountDetails[1] = usdtAddrArb;
            accountDetails[2] = 0;
            await assert.rejects(async () => {
                await ozlDiamond.createNewProxy(accountDetails, ops);
            }, {
                name: 'Error',
                message: (await err()).zeroSlippage
            });
        });

        it('should not allow to create an account with an slippage of more than 5% / createNewProxy()', async () => {
            accountDetails[2] = 501;
            await assert.rejects(async () => {
                await ozlDiamond.createNewProxy(accountDetails, ops);
            }, {
                name: 'Error',
                message: (await err()).zeroSlippage
            });
        });

        it('should not allow to create a account with a token not found in the database / createNewProxy()', async () => {
            accountDetails[1] = deadAddr;
            accountDetails[2] = defaultSlippage;
            await assert.rejects(async () => {
                await ozlDiamond.createNewProxy(accountDetails, ops);
            }, {
                name: 'Error',
                message: (await err(deadAddr)).tokenNotFound
            });
        })

        xit('should have an initial balance of 0.1 ETH', async () => { 
            accountDetails[1] = usdtAddrArb;
            newProxyAddr = await createProxy(proxyFactory, accountDetails);

            balance = await sendETH(newProxyAddr, 0.1);
            assert.equal(formatEther(balance), '0.1');
        });

        

    });


});