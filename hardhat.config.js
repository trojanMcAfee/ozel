require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
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
      //   url: process.env.MAINNET,
      //   blockNumber: 15823986    // 14689661 - 14.689.661 gas: 1,106 (passing) ETH bal: 5.188593275449158
      //   /**
      //    * 15823986 (block of all tests)
      //    * gelato changed some internal contracts - do eth tests with a recent block 
      //    * 14.688.951 (block of baseFee 7,8k)
      //    */
      // }
      forking: {
        url: process.env.ARBITRUM,
        blockNumber: 51708484,      //7880962
      }
    },
    goerli: {
      url: process.env.GOERLI,
      accounts: [process.env.PK]
    },
    arb_goerli: {
      url: process.env.ARB_GOERLI,
      accounts: [process.env.PK]
    },
    arbitrum: {
      url: process.env.ARBITRUM,
      accounts: [process.env.PK_DEPLOYER]
    },
    mainnet: {
      url: process.env.MAINNET,
      accounts: [process.env.PK]
    },
  }
};
