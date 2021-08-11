require("@nomiclabs/hardhat-waffle");
require('dotenv').config();

// Tasks
require("./tasks/accounts.js");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
      hardhat: {
          //forking: {
          //  url: process.env.ALCHEMY_MAINNET_RPC_URL
          //}
      },
      localhost: {
      },
      kovan: {
          url: process.env.KOVAN_RPC_URL,
          accounts: [process.env.PRIVATE_KEY],
          saveDeployments: true,
      },
      //binance: {
      //
      //},
      binance_testnet: {
          url: process.env.BINANCE_TESTNET_RPC_URL,
          chainId: 97,
          gasPrice: 10000000000,
          accounts: [process.env.PRIVATE_KEY],
          saveDeployments: true,
      }
  },
  solidity: "0.8.6",
};
