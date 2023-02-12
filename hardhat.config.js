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
      // forking: {
      //   url: process.env.MAINNET,
      //   blockNumber: 16612926    // 14689661 - 14.689.661 gas: 1,106 (passing) ETH bal: 5.188593275449158
      //   /**
      //    * 15823986 (block of all tests)
      //    * gelato changed some internal contracts - do eth tests with a recent block 
      //    * 14.688.951 (block of baseFee 7,8k)
      //    */
      // }
      forking: {
        url: process.env.ARBITRUM, //56830170
        blockNumber: 60363546,      
      }
    },
    goerli: {
      url: process.env.GOERLI,
      accounts: [process.env.PK_TESTNET]
    },
    arb_goerli: {
      url: process.env.ARB_GOERLI,
      accounts: [process.env.PK]
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: "PKMQZ1HYE2PQSXFS5PEZNVB6F2GIUYHD9A"
  }
};
