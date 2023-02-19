

async function main() {
    const redeemedHashesAddr = '0xD617AfE3D42Ca8e5a1514A90Ec14020E85993079';
    const redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);
    const newOwner = '0x366D9C2cf28A2A5A4d80879964AF1EBb7D7dB086';

    let owner = await redeemedHashes.owner();
    console.log('owner old: ', owner);

    const tx = await redeemedHashes.transferOwnership(newOwner);
    const receipt = await tx.wait();
    console.log('done: ', receipt.transactionHash);

    owner = await redeemedHashes.owner();
    console.log('owner new: ', owner);

}

main();