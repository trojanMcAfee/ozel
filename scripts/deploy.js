

async function main() {

    const registryAddr = '0x557e211EC5fc9a6737d2C6b7a1aDe3e0C11A8D5D';
    
    const BTCminter = await hre.ethers.getContractFactory("BTCminter");
    const btcMinter = await BTCminter.deploy(registryAddr);
    await btcMinter.deployed();
    console.log("btcMinter deployed to:", btcMinter.address);
  
  }
  
  
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });