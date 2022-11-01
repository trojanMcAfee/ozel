const { ethers } = require('ethers');
const { formatEther } = ethers.utils;
const { l2ProviderTestnet } = require('./state-vars.js');



async function main() {
    const myAddr = 'account connected to metamask'; 
    const diamondAddr = '';
    const ozlDiamond = await hre.ethers.getContractAt('Diamond', diamondAddr);

    const ozlBalance = await ozlDiamond.balanceOf(myAddr);
    const [ wethUserShare, usdUserShare ] = await ozlDiamond.getOzelBalances(myAddr);

    return [
        ozlBalance, 
        wethUserShare,
        usdUserShare
    ]
}




main();