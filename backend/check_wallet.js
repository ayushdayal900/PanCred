const { ethers } = require('ethers');
require('dotenv').config();
const addressConfig = require('./contracts/addresses.json');
const _tUSDTAbi = require('./contracts/MockUSDT.json');
const tUSDTAbi = Array.isArray(_tUSDTAbi) ? _tUSDTAbi : _tUSDTAbi.abi;

async function main() {
    try {
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com');
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        console.log("Backend Wallet Address:", wallet.address);
        console.log("MockUSDT Contract Address:", addressConfig.mockUSDT);

        const tokenContract = new ethers.Contract(addressConfig.mockUSDT, tUSDTAbi, wallet);
        const amount = ethers.parseUnits('1000', 6);
        
        console.log("Simulating/sending mint transaction...");
        const tx = await tokenContract.mint(wallet.address, amount);
        console.log("Transaction sent. Hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("Transaction mined successfully! Status:", receipt.status);
    } catch (e) {
        console.error("MINT TRANSACTION FAILED!");
        console.error("Error details:", e);
    }
}

main();
