require("@nomiclabs/hardhat-waffle");
require('dotenv').config();


module.exports = {
  solidity: "0.8.4",
  networks: {
    hardhat: {
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
