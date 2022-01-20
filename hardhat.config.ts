import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import { config } from "dotenv";

import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
config();
config({ path: `.env.${process.env.NODE_ENV}` });

const { utils } = require("ethers");

const mnemonic = process.env.MNEMONIC;
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.4.0",
      },
      {
        version: "0.6.2",
      },
      {
        version: "0.6.12",
      },
      {
        version: "0.8.2",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    crotestnet: {
      url: "https://cronos-testnet-3.crypto.org:8545",
      chainId: 338,
      accounts: {
        mnemonic,
        path: "m/44'/60'/0'/0",
        inittialIndex: 0,
        count: 10,
      },
    },
    localhost: {
      url: `http://localhost:8545`,
      accounts: {
        mnemonic,
        path: "m/44'/60'/0'/0",
        inittialIndex: 0,
        count: 10,
      },
      timeout: 150000,
      gasPrice: parseInt(utils.parseUnits("132", "gwei")),
    },
    cromainnet: {
      url: "https://evm-cronos.crypto.org",
      chainId: 25,
      accounts: {
        mnemonic,
        path: "m/44'/60'/0'/0",
        inittialIndex: 0,
        count: 10,
      },
    },
  },
  mocha: {
    timeout: 200000,
  },
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
    externalArtifacts: ["externalArtifacts/*.json"], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
  },
};
