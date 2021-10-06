const { parseUnits } = ethers.utils;

// async function main() { //BTCminter / PayMe2

//   const registryAddr = '0x557e211EC5fc9a6737d2C6b7a1aDe3e0C11A8D5D';
  
//   const BTCminter = await hre.ethers.getContractFactory("BTCminter");
//   const btcMinter = await BTCminter.deploy(registryAddr);
//   await btcMinter.deployed();
//   console.log("btcMinter deployed to:", btcMinter.address);

// }

// async function main() {
//   const pBTCaddr = '0xff9a0ca711bf8d1584ce08632fd60dddc0034098';
//   const PayMe = await hre.ethers.getContractFactory("PayMe");
//   const payme = await PayMe.deploy(pBTCaddr, {
//     gasPrice: parseUnits('150', 'gwei')
//   });
//   await payme.deployed();
//   console.log("PayMe deployed to:", payme.address);
// }

async function main() { //KOVAN
  const registryAddr = '0x557e211EC5fc9a6737d2C6b7a1aDe3e0C11A8D5D'; 
  const vaultAddr = '0xEcdbfB73eEa09465AcE272AeE763538ACe7Ae24a';

  const PayMe = await hre.ethers.getContractFactory("PayMe2");
  const payme = await PayMe.deploy(registryAddr, vaultAddr);
  await payme.deployed();
  console.log("PayMe2 on Kovan deployed to:", payme.address);
}


// async function main() {
//   const Vault = await hre.ethers.getContractFactory('Vault');
//   const vault = await Vault.deploy();
//   const vaultContract = await vault.deployed();

//   console.log('Vault deployed to: ', vaultContract.address);
// }
  
  
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });