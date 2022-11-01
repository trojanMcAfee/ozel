const { ethers } = require('ethers');
const { formatEther } = ethers.utils;
const { l2ProviderTestnet, l2Signer } = require('./state-vars.js');

//Set of auto-redeem contracts deployed to Goerli and Arb Goerli

// signer address:  0x0E743a1E37D691D8e52F7036375F3D148B4116ba
// FakeGoerliOZL deployed to:  0x543711ED09A2d8a2c34b7599d9e323cd03B05c94
// Emitter deployed to:  0xF2CBA3Ff01788713dDa2637C87a2B2FFd4365eE9
// ozPayMe deployed to:  0xCE91A7cA139e778c89F0E319358Aa19f8c3D5754
// StorageBeacon deployed to:  0x3996522Bc9903f00c4f62aa71CAB48506fd9692D
// ozUpgradeableBeacon deployed to:  0x48959072D9d770A67E0CA5DCBEFdeb8DE191c697
// ProxyFactory deployed to:  0x4FECd47761bFb55E981604E4C331f4F8Fa97Df58
// ozERC1967Proxy deployed to:  0x31ED67cd9F4520c4783DD779cb0E824e61C2B665
// initialize with hash:  0xb633f5eeb888c0df12b81adf7a7c008499a6c1464361ea4d1e3dde5b5bbd356b
// RedeemedHashes deployed to:  0x264dA78E44781eCDFdff18e11C5759DcC582B231
// RolesAuthority deployed to:  0x68F08850f630524C907C771056d809c91BF48460
// createNewProxy with hash:  0x2a6b7c3ce5343361ea137d7c9c982efa4ed9602eb0ff61255d57ed3d13265d1c
// proxy 1:  0x0db608Ba3a657Fd4CE9296d45d37AE1D8D80efb3
// task id:  0x9788ddb664e3ec49dc7aa2b2e8c2532dfc21d38412004bf87f14d383471ad343



async function main() {
    const myAddr = '0x0E743a1E37D691D8e52F7036375F3D148B4116ba'; //main Metamask acc 
    const diamondAddr = '0x543711ED09A2d8a2c34b7599d9e323cd03B05c94'; //fakeGoerliOZL
    const ozlDiamond = await hre.ethers.getContractAt('FakeGoerliOZL', diamondAddr);

    const ozlBalance = await ozlDiamond.balanceOf(myAddr);
    const [ wethUserShare, usdUserShare ] = await ozlDiamond.getOzelBalances(myAddr);

    console.log('ozlBalance: ', formatEther(ozlBalance));
    console.log('wethUserShare: ', formatEther(wethUserShare));
    console.log('usdUserShare: ', formatEther(usdUserShare));

    return [
        ozlBalance, 
        wethUserShare,
        usdUserShare
    ];
}




main();