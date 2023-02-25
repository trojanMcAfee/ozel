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
    activateProxyLikeOpsL2,
    getInitSelectors,
    deployV1_1
} = require('../../../scripts/helpers-arb');

const { getSelectors } = require('../../../scripts/myDiamondUtil');

const { 
    createProxy, 
    sendETH,
    activateOzBeaconProxy,
    deployContract
} = require('../../../scripts/helpers-eth');

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
    pokeMeOpsAddr,
    accountL2ABI,
    fraxAddr,
    wbtcAddr
} = require('../../../scripts/state-vars');;

const { MaxUint256 } = ethers.constants;


let ozlDiamondAddr, ozlDiamond, newProxyAddr, ozMiddle;
let ownerAddr, signer, signerAddr;
let tx, receipt, balance, accData;
let usersProxies = [];
let signers, signerAddr2, beacon, ozMiddleware;
let facetCut, accounts, names, accountDetails;
let factory, factoryAddr, constrArgs, beaconAddr;


describe('With deployed OZL', async () => {

    before(async () => {
        ozlDiamondAddr = '0x7D1f13Dd05E6b0673DC3D0BFa14d40A74Cfa3EF2';
        deployer2 = '0xe738696676571D9b74C81716E4aE797c2440d306';
        account = '0xb922E7FD3b4b7829D096508B6e492FA99cc8cCF0';
        testAcc2 = '0x9c1241606DafbAeE46dFAdF3B0deCd0B653f342e';
        testAcc = '0xc4D53D620d2ce9f0DE3eC241d4B74DD36A2989a1';
        ozlDiamond = await hre.ethers.getContractAt(diamondABI, ozlDiamondAddr);
        signerAddr = testAcc;
        ([ signer ] = await hre.ethers.getSigners());

        ([ ozMiddleware, beacon ] = await deployV1_1(ozlDiamond, deployer2));

        accountDetails = [
            signerAddr,
            usdtAddrArb,
            defaultSlippage,
            'test'
        ];

        accData = getAccData(testAcc, usdtAddrArb, defaultSlippage);

        //-------
        ([signer] = await hre.ethers.getSigners());
        ops.value = parseEther('11');
        ops.to = deployer2;
        tx = await signer.sendTransaction(ops);
        await tx.wait();
        console.log('eth sent out');
        delete ops.value;
        delete ops.to;

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [deployer2],
        });

        const depSigner = await hre.ethers.provider.getSigner(deployer2);
        const signerAddrUndoAlias = '0xe28ed6e51aad88f6f4ce6ab8827279cfffb91155';
        await ozlDiamond.connect(depSigner).setAuthorizedCaller(signerAddrUndoAlias, true, ops);

        await hre.network.provider.request({
            method: "hardhat_stopImpersonatingAccount",
            params: [deployer2],
        });
    });

    it('ll ll ll', async () => {
        const ozMiddleL2BeforeAlias = '0x95401dc811bb5740090279Ba06cfA8fcF6113778';
        const undoAliasAddrOzMiddleL2 = '0x73d974d481ee0a5332c457a4d796187f6ba66eda'; //0x73d974d481ee0a5332c457a4d796187f6ba66eda
        ([ balanceWETH, balanceUSD ] = await ozlDiamond.getOzelBalances(testAcc2));
        ozlBalance = await ozlDiamond.balanceOf(testAcc2);
        console.log('ozl bal testAcc2: ', formatEther(ozlBalance));

        ozlBalance = await ozlDiamond.balanceOf(testAcc);
        console.log('ozl bal testAcc: ', formatEther(ozlBalance));

        console.log('bal weth testAcc2: ', formatEther(balanceWETH));
        console.log('bal usd testAcc2: ', formatEther(balanceUSD));

        //-------------
        // accountDetails[0] = testAcc;
        // newProxyAddr = await createProxy(ozlDiamond, accountDetails);

        const value = parseEther('1');
        const iface = new ethers.utils.Interface(diamondABI);
        const encodedData = iface.encodeFunctionData('exchangeToAccountToken', [
            accData,
            value,
            account
        ]);

        ops.value = value;
        ops.to = ozlDiamond.address;
        ops.data = encodedData;
        tx = await signer.sendTransaction(ops);
        await tx.wait();

        //--------
        // const [signer] = await hre.ethers.getSigners();
        // ops.value = parseEther('11');
        // ops.to = undoAliasAddrOzMiddleL2;
        // tx = await signer.sendTransaction(ops);
        // await tx.wait();
        // console.log('eth sent out');
        //-----

        // ops.to = ozlDiamond.address;
        // ops.value = value;
        // ops.data = encodedData;

        // await hre.network.provider.request({
        //     method: "hardhat_impersonateAccount",
        //     params: [undoAliasAddrOzMiddleL2],
        // });

        // const accSigner = await hre.ethers.provider.getSigner(undoAliasAddrOzMiddleL2);
        // console.log(11);
        // tx = await accSigner.sendTransaction(ops);
        // console.log(12);
        // await tx.wait();

        // await hre.network.provider.request({
        //     method: "hardhat_stopImpersonatingAccount",
        //     params: [undoAliasAddrOzMiddleL2],
        // });

        ozlBalance = await ozlDiamond.balanceOf(testAcc);
        console.log('ozl bal testAcc - 2nd: ', formatEther(ozlBalance));
    });


});