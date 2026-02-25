const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("----------------------------------------------------");
    console.log("Deploying SoulboundIdentity with account:", deployer.address);

    // Initial owner will be the deployer
    const SoulboundIdentity = await hre.ethers.getContractFactory("SoulboundIdentity");
    const identity = await SoulboundIdentity.deploy(deployer.address);

    await identity.waitForDeployment();

    const address = await identity.getAddress();
    console.log("SoulboundIdentity deployed to:", address);
    console.log("----------------------------------------------------");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
