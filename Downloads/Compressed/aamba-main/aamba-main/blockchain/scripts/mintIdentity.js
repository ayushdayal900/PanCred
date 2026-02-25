const hre = require("hardhat");

/**
 * Script to mint a Soulbound Identity NFT to a specific address.
 * Use: npx hardhat run scripts/mintIdentity.js --network amoy
 */
async function main() {
    // --- CONFIGURATION ---
    // The address of your deployed SoulboundIdentity contract
    const CONTRACT_ADDRESS = "0xe2D9450502339b5aD441E563BBe61e88dfc65fF9";

    // The wallet address that should receive the Identity NFT
    // REPLACE THIS with your own address or the user's address!
    const RECIPIENT_ADDRESS = "0xdcA6845bC20c19Cfc5074AaC0b940657FDE53B4D";
    // ---------------------

    const [deployer] = await hre.ethers.getSigners();

    console.log("----------------------------------------------------");
    console.log("Minting Identity NFT using account:", deployer.address);
    console.log("Contract Address:", CONTRACT_ADDRESS);
    console.log("Recipient Address:", RECIPIENT_ADDRESS);

    // Get the contract instance
    const SoulboundIdentity = await hre.ethers.getContractAt("SoulboundIdentity", CONTRACT_ADDRESS);

    try {
        console.log("\n⏳ Sending mint transaction...");

        const tx = await SoulboundIdentity.mintIdentity(RECIPIENT_ADDRESS);

        console.log("🔗 Transaction Hash:", tx.hash);
        console.log("⏳ Waiting for confirmation...");

        const receipt = await tx.wait();

        console.log("\n✅ SUCCESS!");
        console.log("Identity NFT minted successfully to:", RECIPIENT_ADDRESS);
        console.log("View on Explorer: https://amoy.polygonscan.com/tx/" + tx.hash);
    } catch (error) {
        console.error("\n❌ MINTING FAILED!");

        if (error.message.includes("Soulbound_AlreadyHasIdentity")) {
            console.error("Error: This address already owns an Identity NFT.");
        } else if (error.message.includes("OwnableUnauthorizedAccount")) {
            console.error("Error: You are not the owner of this contract.");
        } else {
            console.error(error);
        }
    }
    console.log("----------------------------------------------------");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
