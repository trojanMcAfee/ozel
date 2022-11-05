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
      forking: {
        url: process.env.ALCHEMY_ETH,
        blockNumber: 14690061 //14.689.061 gas: 5k -  14.699.061: gas 70 - 14.690.061 gas: 300 (passing)
        /**
         * 15823986 (block of all tests)
         * gelato changed some internal contracts - do eth tests with a recent block 
         * 14.688.951 (block of baseFee 7,8k)
         */
      }
      // forking: {
      //   url: process.env.ARBITRUM,
      //   blockNumber: 7880962      //2227440
      // }
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
