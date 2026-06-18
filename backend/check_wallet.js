const { ethers } = require('ethers');
require('dotenv').config();
const addressConfig = require('./contracts/addresses.json');
const _tUSDTAbi = require('./contracts/MockUSDT.json');
const tUSDTAbi = Array.isArray(_tUSDTAbi) ? _tUSDTAbi : _tUSDTAbi.abi;

async function main() {
    try {
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com');
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const tokenContract = new ethers.Contract(addressConfig.mockUSDT, tUSDTAbi, wallet);
        
        const borrowerAddress = "0x1768dc0277EA15125e8dA3388C4C96b543f4889c";
        const amount = ethers.parseUnits('5000', 6);
        
        console.log(`Minting 5000 tUSDT to borrower: ${borrowerAddress}...`);
        const tx = await tokenContract.mint(borrowerAddress, amount);
        console.log("Tx Hash:", tx.hash);
        await tx.wait();
        console.log("Successfully minted 5000 tUSDT to the borrower!");
    } catch (e) {
        console.error("Mint failed:", e);
    }
}

main();
