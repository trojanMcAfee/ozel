

// signer address:  0x0E743a1E37D691D8e52F7036375F3D148B4116ba
// fakeOZL deployed to:  0xD1ee938A82F6cAa151056fd160b7C523AE029d8F
// Emitter deployed to:  0x2aA80df7466fD490E2ad3DE9BD2E5462d76E62c9
// ozPayMe deployed to:  0x78c862d984233a9273e2Bcf23c2b821d9b32113a
// StorageBeacon deployed to:  0x725b97B129E92C581Ec2f2e006380f9B3d43eAaf
// ozUpgradeableBeacon deployed to:  0x804e819d5b5CE1380E7ef3d306597AC98e2410dd
// ProxyFactory deployed to:  0x10CE522f9e7480D06218ab1B0E23Fed749029313
// ozERC1967Proxy deployed to:  0xe3631d1489D598da69a540E08691501efc81B094
// initialize with hash:  0x0e31ec3f48c96dbb8e84fdaad493c85431b930283ef27c6922b8e67263211b24
// RolesAuthority deployed to:  0x7F17f50b248DA02bB697fbd7deA288e3A07AaDd0
// createNewProxy with hash:  0x0a7388474f5d0cbc77917ee1523232e4a6cf4ebaaca2939117ae49069efbdbb0
// proxy 1:  0x98298D0267c48a246DC8bfEFAa85f9a64621DF54
// task id:  0xaf4a5ea30c55e06abaa84c5c99b746c3eb12c7ad53078aea66316d67a778b9dd
// **** Missing RedeemHashes contact ****



const { ETH } = require('./state-vars');
const { ethers } = require("ethers");
const fakeOzlABI = require('../artifacts/contracts/ethereum/FakeOZL.sol/FakeOZL.json').abi;
const { formatEther } = ethers.utils;


async function main() {
    const ARB_GOERLI = 'https://arb-goerli.g.alchemy.com/v2/74guRYnbpMeyqhRU7U99rTiq9zzPFNXb';
    const l2Provider = new ethers.providers.JsonRpcProvider(ARB_GOERLI);

    const myAddr = ''; // <----- connected Metamask account goes here
    const fakeOZLaddr = '0xF9C5Ef23Da6c3139a1B7f9DBb5d5303338e0b52B'; 
    const fakeOZL = new ethers.Contract(fakeOZLaddr, fakeOzlABI, l2Provider);

    const totalVolumeInUSD = await fakeOZL.getTotalVolumeInUSD();
    console.log('getTotalVolumeInUSD - 500: ', formatEther(totalVolumeInUSD));

    const totalVolumeInETH = await fakeOZL.getTotalVolumeInETH();
    console.log('getTotalVolumeInETH - 400: ', formatEther(totalVolumeInETH));

    const [ wethUM, valueUM ] = await fakeOZL.getAUM();
    console.log('wethUM - 300: ', formatEther(wethUM));
    console.log('valueUM - 200: ', formatEther(valueUM));

    const ozlBalance = await fakeOZL.balanceOf(ETH);
    console.log('balanceOf - 100: ', formatEther(ozlBalance));

    const [ wethUserShare, usdUserShare ] = await fakeOZL.getOzelBalances(ETH);
    console.log('wethUserShare - 220: ', formatEther(wethUserShare));
    console.log('usdUserShare - 150: ', formatEther(usdUserShare));

}




main();