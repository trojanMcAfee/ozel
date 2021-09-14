const { abi } = require('../artifacts/contracts/BTCminter.sol/BTCminter.json');

async function balanceOf() {
    // console.log(abi);

    const btcMinterAddr = '0xA9816e2Ca3DC637ED385F50F5Ba732c4a7f6fa4A';
    const btcMinter = await hre.ethers.getContractAt(abi, btcMinterAddr);
    const balance = await btcMinter.balance();

    console.log('balance: ', balance.toString() / 10 ** 8);


}


balanceOf()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });