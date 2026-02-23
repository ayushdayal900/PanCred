const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    // For MyToken, we need to pass the initialOwner address to the constructor
    const MyToken = await hre.ethers.getContractFactory("MyToken");
    const token = await MyToken.deploy(deployer.address);

    await token.waitForDeployment();

    console.log("MyToken deployed to:", await token.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
