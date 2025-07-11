require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL;
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_PROJECT_ID",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
      gasPrice: 20000000000, // 20 gwei
    },
    mainnet: {
      url: MAINNET_RPC_URL || "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 1,
      gasPrice: 30000000000, // 30 gwei (adjust based on network conditions)
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY || "YOUR_ETHERSCAN_API_KEY",
      mainnet: ETHERSCAN_API_KEY || "YOUR_ETHERSCAN_API_KEY",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 30,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
};