require("@nomiclabs/hardhat-waffle");
// require("@nomiclabs/hardhat-ethers");
require('dotenv').config();


module.exports = {
  solidity: "0.8.14", //"0.8.9"
  networks: {
    hardhat: {
      // forking: {
      //   url: process.env.ALCHEMY_ETH,
      //   blockNumber: 14842470 //14309412 
      // }
      forking: {
        url: process.env.ARBITRUM,
        blockNumber: 7880962      //2227440
      }
    },
    ropsten: {
      url: process.env.ROPSTEN_URL,
      accounts: [process.env.PK]
    },
    matic: {
      url: process.env.POLYGON,
      accounts: [process.env.PK]
    },
    kovan: {
      url: process.env.KOVAN,
      accounts: [process.env.PK]
    },
    rinkeby: {
      url: process.env.RINKEBY,
      accounts: [process.env.PK]
    },
    arb: {
      url: process.env.ARB_TESTNET,
      accounts: [process.env.PK]
    }
  }
};
