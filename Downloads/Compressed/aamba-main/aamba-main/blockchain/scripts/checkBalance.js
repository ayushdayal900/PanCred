const ethers = require("ethers");
require("dotenv").config();

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const balance = await provider.getBalance(wallet.address);
    console.log("Address:", wallet.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");
}

main().catch(console.error);
