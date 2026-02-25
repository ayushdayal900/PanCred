import { ethers } from 'ethers';
import addresses from './contracts/addresses.json';

const IdentityABI = [
    "function mintIdentity() external",
    "function balanceOf(address owner) view returns (uint256)"
];

const SEPOLIA_IDENTITY_ADDRESS = addresses.identity;

export const getBlockchainSigner = async () => {
    if (!window.ethereum) throw new Error("MetaMask not found.");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return signer;
};

export const getIdentityContract = async (signer) => {
    return new ethers.Contract(
        SEPOLIA_IDENTITY_ADDRESS,
        IdentityABI,
        signer
    );
};

export const mintIdentity = async (signer, onSent) => {
    if (!signer) throw new Error("No signer provided");
    const identityContract = await getIdentityContract(signer);

    console.log("[Blockchain] Initiating Identity Mint with signer:", signer.address);
    try {
        const tx = await identityContract.mintIdentity();
        console.log("[Blockchain] Mint transaction sent:", tx.hash);
        if (onSent) onSent(tx.hash);

        const receipt = await tx.wait();
        console.log("[Blockchain] Mint confirmed in block:", receipt.blockNumber);

        // Verify ownership
        const balance = await identityContract.balanceOf(signer.address);
        if (balance === 0n) {
            throw new Error("Mint completed but identity token not found. Please try again or check Etherscan.");
        }

        return {
            receipt,
            txHash: tx.hash,
            address: signer.address
        };
    } catch (err) {
        console.error("[Blockchain] Minting error:", err);
        throw err;
    }
};

export const checkIdentityOwnership = async (userAddress) => {
    if (!userAddress) return false;
    try {
        // Use public RPC for ownership check to avoid triggering wallet prompts
        const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
        const identityContract = new ethers.Contract(
            SEPOLIA_IDENTITY_ADDRESS,
            IdentityABI,
            provider
        );
        const balance = await identityContract.balanceOf(userAddress);
        return balance > 0n;
    } catch (error) {
        console.error("[Blockchain] Ownership check failed:", error);
        return false;
    }
};
