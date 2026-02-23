require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {
            // Local development network
        },
        amoy: {
            url: process.env.POLYGON_AMOY_RPC_URL || "",
            accounts:
                process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
            chainId: 80002,
        },
    },
    etherscan: {
        apiKey: process.env.POLYGONSCAN_API_KEY || "",
    },
    sourcify: {
        enabled: false,
    },
};
