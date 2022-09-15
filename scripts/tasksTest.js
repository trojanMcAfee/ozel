


async function queryRedeemedContract() {
    const taskId = '0xb6fd8625541b1f084582b7af4cb549cfcc712b291ea73b0699313644ed92bf14';
    const redeemedHashesAddr = '0xaf77634552BB61d593448D035fcFeae5a73Ab021';
    const redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);

    const total = await redeemedHashes.getTotalRedemptions();
    console.log('total redemptions: ', total);

    // const hash = '0x6b0eb6c27fc52bb99843758056aa2d6cfbc08f1c1776c73584aceee9c3b5a87c';
    // const redeemed = await redeemedHashes.wasRedeemed(taskId, hash);
    // console.log('was redemeed: ', redeemed);

    // const redeemsPerTask = await redeemedHashes.getRedeemsPerTask(taskId);
    // console.log('per task: ', redeemsPerTask); 
}

queryRedeemedContract();


async function main() {
    const Redeem = await hre.ethers.getContractFactory('RedeemedHashes');
    const redeem = await Redeem.deploy();
    await redeem.deployed();
    console.log('redeem deployed to: ', redeem.address);

    const hash = '0xfb0b38a68a3b331c28b0045df952bd1a7fbaa29d4284e185e440180f3941b7af';
    const taskId = '0xb6fd8625541b1f084582b7af4cb549cfcc712b291ea73b0699313644ed92bf14';
    await redeem.storeRedemption(taskId, hash);

    const is = await redeem.wasRedeemed(taskId, hash);
    console.log('should be true *****: ', is);

}

// main();
