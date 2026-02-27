// scripts/deployFactory.js
// Deploys LoanAgreementFactory + syncs addresses and ABI to frontend and backend.

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying LoanAgreementFactory with deployer:", deployer.address);

    // --- Load existing addresses to get identity + treasury ---
    const addressesPath = path.join(__dirname, "../deployedAddresses.json");
    let current = {};
    if (fs.existsSync(addressesPath)) {
        current = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    }

    const identityAddress = current.identity;
    const treasuryAddress = current.treasury || deployer.address;

    if (!identityAddress) {
        throw new Error("Identity contract address not found in deployedAddresses.json. Deploy Identity first.");
    }

    console.log("Using Identity:", identityAddress);
    console.log("Using Treasury:", treasuryAddress);

    // --- Compile ---
    await hre.run("compile");

    // --- Deploy LoanAgreementFactory ---
    const Factory = await hre.ethers.getContractFactory("LoanAgreementFactory");
    const factory = await Factory.deploy(identityAddress, treasuryAddress);
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("LoanAgreementFactory deployed to:", factoryAddress);

    // --- Update deployedAddresses.json ---
    current.loanFactory = factoryAddress;
    fs.writeFileSync(addressesPath, JSON.stringify(current, null, 2));
    console.log("Updated deployedAddresses.json");

    // ---- Sync ABIs ----
    const factoryArtifact = await hre.artifacts.readArtifact("LoanAgreementFactory");
    const agreementArtifact = await hre.artifacts.readArtifact("LoanAgreement");

    const frontendContracts = path.join(__dirname, "../../frontend/src/contracts");
    const backendContracts = path.join(__dirname, "../../backend/contracts");

    // --- Frontend addresses.json ---
    const feAddressPath = path.join(frontendContracts, "addresses.json");
    let feAddresses = JSON.parse(fs.readFileSync(feAddressPath, "utf8"));
    feAddresses.loanFactory = factoryAddress;
    feAddresses.treasury = treasuryAddress;
    fs.writeFileSync(feAddressPath, JSON.stringify(feAddresses, null, 2));
    console.log("Updated frontend/src/contracts/addresses.json");

    // --- Backend addresses.json ---
    const beAddressPath = path.join(backendContracts, "addresses.json");
    let beAddresses = JSON.parse(fs.readFileSync(beAddressPath, "utf8"));
    beAddresses.loanFactory = factoryAddress;
    beAddresses.treasury = treasuryAddress;
    fs.writeFileSync(beAddressPath, JSON.stringify(beAddresses, null, 2));
    console.log("Updated backend/contracts/addresses.json");

    // --- Factory ABI → frontend (wrapped) ---
    fs.writeFileSync(
        path.join(frontendContracts, "LoanAgreementFactory.json"),
        JSON.stringify({ abi: factoryArtifact.abi }, null, 2)
    );
    // --- Factory ABI → backend (flat array) ---
    fs.writeFileSync(
        path.join(backendContracts, "LoanAgreementFactory.json"),
        JSON.stringify(factoryArtifact.abi, null, 2)
    );

    // --- Agreement ABI → frontend ---
    fs.writeFileSync(
        path.join(frontendContracts, "LoanAgreement.json"),
        JSON.stringify({ abi: agreementArtifact.abi }, null, 2)
    );
    // --- Agreement ABI → backend ---
    fs.writeFileSync(
        path.join(backendContracts, "LoanAgreement.json"),
        JSON.stringify(agreementArtifact.abi, null, 2)
    );

    console.log("ABIs synced to frontend and backend.");
    console.log("\n✅ Deployment complete!");
    console.log("   LoanAgreementFactory:", factoryAddress);
    console.log("   Treasury:            ", treasuryAddress);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
