const { ethers } = require("ethers");
const assert = require('assert');
const {
    parseEther, 
    formatEther, 
    hexStripZeros 
} = ethers.utils;

const { err } = require('../../errors'); 

const { 
    balanceOfOZL, 
    transferOZL, 
    withdrawShareOZL, 
    getVarsForHelpers,
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
    deployFacet,
    activateProxyLikeOpsL2
} = require('../../../scripts/helpers-arb');

const { getSelectors } = require('../../../scripts/myDiamondUtil');
const { createProxy, sendETH } = require('../../../scripts/helpers-eth');

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


let ozlDiamondAddr, ozlDiamond, newProxyAddr;
let ownerAddr, signer, signerAddr;
let tx, receipt, balance, accData;

describe('v1.1 tests', async function () {
    this.timeout(1000000);

    // before(async () => {
        // ([ signer ] = await hre.ethers.getSigners());
        // signerAddr = await signer.getAddress();

        // accountDetails = [
        //     signerAddr,
        //     usdtAddrArb,
        //     defaultSlippage,
        //     'test'
        // ];

    //     ownerAddr = '0xe738696676571D9b74C81716E4aE797c2440d306';
    //     ozlDiamondAddr = '0x7D1f13Dd05E6b0673DC3D0BFa14d40A74Cfa3EF2';
    //     ozlFacet = '0x3164a03cDbbf607Db19a366416113f7f74341B56';
    //     ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);

    //     //Deploys the ProxyFactory in L2
    //     const Factory = await hre.ethers.getContractFactory('ozProxyFactoryFacet');
    //     const factory = await Factory.deploy(pokeMeOpsAddr);
    //     await factory.deployed();
    //     console.log('ozProxyFactoryFacet deployed to: ', factory.address);

    //     //Deploys ozLoupeFacetV1_1 in L2
    //     const newLoupe = await deployFacet('ozLoupeFacetV1_1');

    //     //Adds them to ozDiamond
    //     ops.value = parseEther('3');
    //     ops.to = ownerAddr;
    //     await signer.sendTransaction(ops);
    //     delete ops.value;
    //     delete ops.to;

    //     await hre.network.provider.request({
    //         method: "hardhat_impersonateAccount",
    //         params: [ownerAddr],
    //     });
    
    //     const ownerSigner = await hre.ethers.provider.getSigner(ownerAddr);
    //     const facetCut = [
    //         [ factory.address, 0, getSelectors(factory) ],
    //         [ newLoupe.address, 0, getSelectors(newLoupe) ]
    //     ];
    //     await ozlDiamond.connect(ownerSigner).diamondCut(facetCut, nullAddr, '0x');

    //     await hre.network.provider.request({
    //         method: "hardhat_stopImpersonatingAccount",
    //         params: [ownerAddr],
    //     });

    //     getVarsForHelpers(ozlDiamond, ozlFacet);

    // });

    before(async () => {
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
        ozlDiamond = await hre.ethers.getContractAt(diamondABI, deployedDiamond.address);

        ([ signer ] = await hre.ethers.getSigners());
        signerAddr = await signer.getAddress();

        accountDetails = [
            signerAddr,
            usdtAddrArb,
            defaultSlippage,
            'test'
        ];

        accData = getAccData(callerAddr, usdtAddrArb, defaultSlippage);

        //----------
        //Deploys ozMiddleware
        const OzMiddle = await hre.ethers.getContractFactory('ozMiddlewareL2');
        const ozMiddle = await OzMiddle.deploy(deployedDiamond.address);
        await ozMiddle.deployed();
        console.log('ozMiddlewareL2 deployed to: ', ozMiddle.address);

        //Deploys ozUpgradeableBeaconL2
        const Beacon = await hre.ethers.getContractFactory('UpgradeableBeacon');
        const beacon = await Beacon.deploy(ozMiddle.address);
        await beacon.deployed();
        console.log('ozUpgradeableBeacon in L2 deployed to: ', beacon.address);

        //Deploys the ProxyFactory in L2
        const Factory = await hre.ethers.getContractFactory('ozProxyFactoryFacet');
        const factory = await Factory.deploy(pokeMeOpsAddr, beacon.address);
        await factory.deployed();
        console.log('ozProxyFactoryFacet deployed to: ', factory.address);

        //Deploys ozLoupeFacetV1_1 in L2
        const newLoupe = await deployFacet('ozLoupeFacetV1_1');

        //Adds them to ozDiamond
        const facetCut = [
            [ factory.address, 0, getSelectors(factory) ],
            [ newLoupe.address, 0, getSelectors(newLoupe) ]
        ];
        await ozlDiamond.diamondCut(facetCut, nullAddr, '0x');

        //Set authorized caller
        const undoAliasAddrOzMiddleL2 = '0x73d974d481ee0a5332c457a4d796187f6ba66eda';
        await ozlDiamond.setAuthorizedCaller(undoAliasAddrOzMiddleL2, true);

    });

    describe('ozProxyFactoryFacet', async () => {
        xit('should create a account successfully / createNewProxy()', async () => {
            await ozlDiamond.createNewProxy(accountDetails, ops);
            ([ proxies, names ] = await ozlDiamond.getAccountsByUser(signerAddr));

            newProxyAddr = proxies[0].toString(); 
            const name = names[0].toString();
            assert.equal(newProxyAddr.length, 42);
            assert(name.length > 0);
        });

        xit('should not allow to create a account witn an empty account name / createNewProxy()', async () => {
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

        xit('should not allow to create a account with a name with more of 18 characters / createNewProxy()', async () => {
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

        xit('should not allow to create a account with the 0 address / createNewProxy()', async () => {
            accountDetails[1] = nullAddr;
            await assert.rejects(async () => {
                await ozlDiamond.createNewProxy(accountDetails, ops);
            }, {
                name: 'Error',
                message: (await err()).zeroAddress 
            });
        });

        xit('should not allow to create a account with 0 slippage / createNewProxy()', async () => {
            accountDetails[1] = usdtAddrArb;
            accountDetails[2] = 0;
            await assert.rejects(async () => {
                await ozlDiamond.createNewProxy(accountDetails, ops);
            }, {
                name: 'Error',
                message: (await err()).zeroSlippage
            });
        });

        xit('should not allow to create an account with an slippage of more than 5% / createNewProxy()', async () => {
            accountDetails[2] = 501;
            await assert.rejects(async () => {
                await ozlDiamond.createNewProxy(accountDetails, ops);
            }, {
                name: 'Error',
                message: (await err()).zeroSlippage
            });
        });

        xit('should not allow to create a account with a token not found in the database / createNewProxy()', async () => {
            accountDetails[1] = deadAddr;
            accountDetails[2] = defaultSlippage;
            await assert.rejects(async () => {
                await ozlDiamond.createNewProxy(accountDetails, ops);
            }, {
                name: 'Error',
                message: (await err(deadAddr)).tokenNotFound
            });
        })

        it('should have an initial balance of 0.1 ETH', async () => { 
            accountDetails[1] = usdtAddrArb;

            tx = await ozlDiamond.createNewProxy(accountDetails, ops);
            receipt = await tx.wait();
            newProxyAddr = hexStripZeros(receipt.events[0].address);

            ops.to = newProxyAddr;
            ops.value = parseEther('0.1')
            await signer.sendTransaction(ops);

            balance = await hre.ethers.provider.getBalance(newProxyAddr);
            assert.equal(formatEther(balance), '0.1');

            //Clean up
            delete ops.to;
            delete ops.value;

            //--------
            await activateProxyLikeOpsL2(newProxyAddr, ozlDiamond.address, accData);

            balance = await hre.ethers.provider.getBalance(newProxyAddr);
            assert.equal(formatEther(balance), 0);
        });

        

    });


});