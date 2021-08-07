require("@nomiclabs/hardhat-waffle");
require('dotenv').config();

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
      }
  },
  solidity: "0.8.6",
};
