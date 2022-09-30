require("@nomiclabs/hardhat-waffle");
// require("@nomiclabs/hardhat-ethers");
require('dotenv').config();


module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.14',
      },
      {
        version: '0.7.6',
      }
    ]
  },
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
    rinkeby: {
      url: process.env.RINKEBY,
      accounts: [process.env.PK]
    },
    arb: {
      url: process.env.ARB_TESTNET,
      accounts: [process.env.PK]
    },
    goerli: {
      url: process.env.GOERLI,
      accounts: [process.env.PK]
    },
    arb_goerli: {
      url: process.env.ARB_GOERLI,
      accounts: [process.env.PK]
    }
  }
};
