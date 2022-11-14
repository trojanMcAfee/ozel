

// signer address:  0x0E743a1E37D691D8e52F7036375F3D148B4116ba
// FakeOZL deployed to:  0xF9C5Ef23Da6c3139a1B7f9DBb5d5303338e0b52B
// Emitter deployed to:  0x0a354358EfDfe7F5e308C4Df16195E300199EdC1
// ozPayMe deployed to:  0xE0ab317b5D7AD571872B025aB6eAE9E60d082467
// StorageBeacon deployed to:  0x53548E9698BC27eCfEd86dbC1Bd47d827912CB75
// ozUpgradeableBeacon deployed to:  0x2A88A544E986c7f26D26FF2A3529eEB02787f4D2
// ProxyFactory deployed to:  0x0cD3a4453c7b3A698AF11f0996f038bEa6eb9348
// ozERC1967Proxy deployed to:  0x70D24Aa818d7531B49841B5bC0cfF5c5CBFEda7b
// initialize with hash:  0x2fda5c0e191e362c4f62ece9f503d666a5d418a1533330d4fd883d7d46e89d7a
// RedeemedHashes deployed to:  0x593a31aeDF34e86C36cadC58a130865587DdC1B4
// RolesAuthority deployed to:  0x1Ea402A28F9504C74881B299c94dA26f748623E2
// createNewProxy with hash:  0x9aa75ee5faf90fc509fd651a7f6ef966fd38f03066590083252cb9c887dad671
// proxy 1:  0x0246bc2BacE3F5763Dfd505EC0D5bb73EDb566f8
// task id:  0x4460594f777222baa6280125d099d4021961be417431f0f7566f79eb01fe9825



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