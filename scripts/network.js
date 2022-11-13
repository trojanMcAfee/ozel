
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



// signer address:  0x0E743a1E37D691D8e52F7036375F3D148B4116ba
// FakeOZL deployed to:  0xAb6E71331EB929251fFbb6d00f571DDdC4aC1D9C
// Emitter deployed to:  0xD78D58C4ec3682aC188cB801e55e2A7Ba7C610d4
// ozPayMe deployed to:  0xf2BC292Ffe8Bd65EDd6f84e3228c0a02e0a24Ec6
// StorageBeacon deployed to:  0x41dfb47e2949F783cf490D2e99E9BbB6FdAdAe1C
// ozUpgradeableBeacon deployed to:  0x90eCef484801156D1b7E7615F1c9F2584c3F69CC
// ProxyFactory deployed to:  0x6b67f89F21B409BbC827e3ADEbD5b30F7786c688
// ozERC1967Proxy deployed to:  0xf616eA563Fd2A85b066f37932156a327B383a349
// initialize with hash:  0xc4c3d00318470dcee3c1059b511161a1136926b27767d2fcdc87e975875f1da1
// RedeemedHashes deployed to:  0x640a47d28475d64438B0181344aD322d89f5D2d8
// RolesAuthority deployed to:  0xbE6a4cD3e8800e78a1c5eaf926De6A96B3847dF4
// createNewProxy with hash:  0x2a05fb7a293dfcf9eda4d998255755e4026ad9f63b65fc29e8de571af457347c
// proxy 1:  0x7C9E3023e8c3b7577A610023781B6c885646a88e
// task id:  0x4d4d4de37331be786e10b615be0f200ae55998ef234bc23aa1ecf2d15b081f84


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