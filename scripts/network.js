
// signer address:  0x0E743a1E37D691D8e52F7036375F3D148B4116ba
// FakeOZL deployed to:  0xB2CfB9e7239e7eFF83D0C730AcFD7a01B76d72f6
// Emitter deployed to:  0xF41DDB1C1bc77B9778b4e3e0985919653a0DB268
// ozPayMe deployed to:  0x44C9c02BAc24a1Ded45Ccb4b0eBdFB72645bAb21
// StorageBeacon deployed to:  0xC745d873ac445b676aDD392aae8E49609282273E
// ozUpgradeableBeacon deployed to:  0x6CE0D1bCf1Bef2dcf9265Ac7b20B91fD951f5E9C
// ProxyFactory deployed to:  0xd8816CeA49Cfa02e7eD47452AfBa8a70e150c5E6
// ozERC1967Proxy deployed to:  0xdcB7231B7d287Eac28CAF0014A7f354a9217B8a1
// initialize with hash:  0x4e6ee16e520d38b6eea15d9ad4ea23d62d61536e6405ec95c4485c755c1ff5e3
// RedeemedHashes deployed to:  0xC8447274c5BED0044Cd1754160Eb295459290D0D
// RolesAuthority deployed to:  0xAb3b4552537e383ff538Ab89b53b0EDFaDfb75D7
// createNewProxy with hash:  0xfe3573bb882879d36347c487287acc3f440d932e9e5b9a8dc9adbca4ea0842ba
// proxy 1:  0x4Cb12002de75C581863C383c38a74F7BFac75515
// task id:  0xb41e8b76c281c56904f8df1013c39c9aa76c59810ed35022271d751b158ffb48


async function main() {
    const myAddr = ''; // <----- connected Metamask account goes here
    const diamondAddr = '0x543711ED09A2d8a2c34b7599d9e323cd03B05c94'; //FakeOZL
    const ozlDiamond = await hre.ethers.getContractAt('FakeOZL', diamondAddr);

    const ozlBalance = await ozlDiamond.balanceOf(myAddr);
    const [ wethUserShare, usdUserShare ] = await ozlDiamond.getOzelBalances(myAddr);

    return [
        ozlBalance, 
        wethUserShare,
        usdUserShare
    ];
}




main();