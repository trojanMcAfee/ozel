const { ethers } = require('ethers');
const assert = require('assert');
const { 
    formatUnits, 
    formatEther,
    parseEther
 } = ethers.utils;

const { 
    gelatoAddr,
    usdtAddrArb,
    defaultSlippage,
    factoryABI
 } = require('../../scripts/state-vars.js');

const {
    deployContract,
    activateOzBeaconProxy,
    deploySystem,
    getEventParam,
    activateProxyLikeOps,
    compareTopicWith,
    storeVarsInHelpers,
    compareEventWithVar,
    compareTopicWith2
 } = require('../../scripts/helpers-eth');


let feeData, baseFee;
let provider;
let balance;

let beacon, beaconAddr;
let ozERC1967proxyAddr;
let storageBeacon, storageBeaconAddr;
let emitter, emitterAddr;
let fakeOZLaddr, varConfig, eMode;

describe('BaseFee stress test', async function () {
    this.timeout(10000000);

    before( async () => {
        provider = await hre.ethers.provider;

        feeData = await provider.getFeeData(); 
        baseFee = Number(feeData.maxFeePerGas);
        baseFeeConverted = formatUnits(baseFee.toString(), 'gwei');
        console.log('base fee of block #14.689.661 (in gwei): ', baseFeeConverted);
        console.log('.');

        ([signerAddr, signerAddr2] = await provider.listAccounts()); 
        signers = await hre.ethers.getSigners();
        console.log('signer address: ', signerAddr);
        console.log('.');

        userDetails = [
            signerAddr,
            usdtAddrArb,
            defaultSlippage 
        ];

        ([
            beacon, 
            beaconAddr, 
            ozERC1967proxyAddr, 
            storageBeacon, 
            storageBeaconAddr, 
            emitter, 
            emitterAddr, 
            fakeOZLaddr, 
            varConfig, 
            eMode
        ] = await deploySystem('Optimistically', userDetails, signerAddr));
        storeVarsInHelpers(ozERC1967proxyAddr);

        proxyFactory = await hre.ethers.getContractAt(factoryABI, ozERC1967proxyAddr);
    });

    describe('Sets up baseFee and proxy', async () => {
        it("should confirm the block's base fee of 2200+", async () => {
            assert(baseFeeConverted > 2200);
        });
    
        it('should confirm a balance of 5+ ETH for the Gelato caller (who executes the bridge tx)', async () => {
            balance = await provider.getBalance(gelatoAddr);
            assert(formatEther(balance) > 5);
        });
    
        it('should create a proxy successfully / createNewProxy()', async () => {
            await proxyFactory.createNewProxy(userDetails);
            newProxyAddr = (await storageBeacon.getProxyByUser(signerAddr))[0].toString(); 
            assert.equal(newProxyAddr.length, 42);
        });
    });

    describe('Sends passing tx with high baseFee', async () => {
        it('should have an initial balance of 0.1 ETH', async () => {
            userDetails[1] = usdtAddrArb;
            await proxyFactory.createNewProxy(userDetails);
            newProxyAddr = (await storageBeacon.getProxyByUser(signerAddr))[0].toString();
    
            await signers[0].sendTransaction({to: newProxyAddr, value: parseEther('0.1')});
            balance = await provider.getBalance(newProxyAddr);
            assert.equal(formatEther(balance), '0.1');
        });
    
        it('should have a final balance of 0 ETH', async () => {
            const tx = await proxyFactory.createNewProxy(userDetails);
            const receipt = await tx.wait();
            newProxyAddr = receipt.logs[0].address;
    
            balance = await provider.getBalance(newProxyAddr);
            if (Number(balance) === 0) await signers[0].sendTransaction({to: newProxyAddr, value: parseEther('0.1')});
    
            await activateProxyLikeOps(newProxyAddr, ozERC1967proxyAddr); 
            balance = await provider.getBalance(newProxyAddr);
            assert.equal(formatEther(balance), 0);
        });
    });
    
    




});