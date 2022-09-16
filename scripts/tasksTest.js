


async function queryRedeemedContract() {
    const taskId = '0x7fa59a409e86fe2ed7bed15b2dd577c864dea384d629c91082ecc5554c80202c';
    const redeemedHashesAddr = '0xd7A008bE42F747281B76b5ceEADC8960Ac9df0e6';
    const redeemedHashes = await hre.ethers.getContractAt('RedeemedHashes', redeemedHashesAddr);

    const total = await redeemedHashes.getTotalRedemptions();
    console.log('total redemptions: ', total);

    const hash = '0x7d2775123fe9e37ba9541654c0d6c4cf7c5ddb8a013c3cd1014d59ac1953b03c';
    const redeemed = await redeemedHashes.wasRedeemed(taskId, hash);
    console.log('was redemeed: ', redeemed);

    const redeemsPerTask = await redeemedHashes.getRedeemsPerTask(taskId);
    console.log('per task: ', redeemsPerTask); 
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
