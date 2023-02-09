require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
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
    },
    goerli: {
      url: process.env.GOERLI,
      accounts: [process.env.PK_TESTNET]
    },
    arb_goerli: {
      url: process.env.ARB_GOERLI,
      accounts: [process.env.PK]
    }
  }
};
