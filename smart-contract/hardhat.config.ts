import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
    baseMainnet: {
      url: "https://base-mainnet.g.alchemy.com/v2/1rH8dhkFuS0-xg2SvpuKib39RtL3Bb_S", // PASTE YOUR RPC URL HERE
      accounts: [process.env.PRIVATE_KEY || ""],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "", // PASTE YOUR ETHERSCAN API KEY HERE
  },
};

export default config;
