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
  const managerAddr = '0xF4CE9dD1b78F42E73adD4761AB4FD47921faB914';
  const feesVault = '0x48b2D3acc1d0724573490fd84dD222D11098e90e';

  const PayMe = await hre.ethers.getContractFactory("PayMe3");
  const payme = await PayMe.deploy(registryAddr, managerAddr);
  await payme.deployed();
  console.log("PayMe3 on Kovan deployed to:", payme.address);
}


// async function main() {
//   const Manager = await hre.ethers.getContractFactory('Manager');
//   const manager = await Manager.deploy('0x48b2D3acc1d0724573490fd84dD222D11098e90e');
//   await manager.deployed();

//   console.log('FeesVault deployed to: ', manager.address);
// }
  
  
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });