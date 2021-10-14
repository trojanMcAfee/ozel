require("@nomiclabs/hardhat-waffle");
require('dotenv').config();


module.exports = {
  solidity: "0.8.9",
  networks: {
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_ETH,
        blockNumber: 13239533 
      }
      // forking: {
      //   url: process.env.ARBITRUM,
      //   blockNumber: 2227440
      // }
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
    }
  }
};
