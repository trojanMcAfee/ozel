const { formatUnits } = ethers.utils;

async function getBaseFee() {
    feeData = await hre.ethers.provider.getFeeData(); 
    baseFee = formatUnits(feeData.maxFeePerGas, 'gwei');
    console.log('base fee of block #14.689.661 (in gwei): ', baseFee);
}


async function main() {
    await getBaseFee();
    await network.provider.send("hardhat_setNextBlockBaseFeePerGas", [
        '0x32EE841B800', //parseUnits('3500', 'gwei') - 0x32EE841B800
    ]);
    await hre.network.provider.send("hardhat_mine");
    await getBaseFee();
}


main();