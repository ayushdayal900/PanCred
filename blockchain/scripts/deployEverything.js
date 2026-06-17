const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("====================================================");
    console.log(`🚀 Starting Full Deployment to ${hre.network.name}`);
    console.log("Deploying with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance));
    console.log("====================================================");

    // 1. Deploy SoulboundIdentity
    console.log("\n📦 Deploying SoulboundIdentity...");
    const SoulboundIdentity = await hre.ethers.getContractFactory("SoulboundIdentity");
    const identity = await SoulboundIdentity.deploy(deployer.address);
    await identity.waitForDeployment();
    const identityAddress = await identity.getAddress();
    console.log("✅ SoulboundIdentity deployed to:", identityAddress);

    // 2. Deploy TrustScoreRegistry
    console.log("\n📦 Deploying TrustScoreRegistry...");
    const TrustScoreRegistry = await hre.ethers.getContractFactory("TrustScoreRegistry");
    const trustRegistry = await TrustScoreRegistry.deploy(deployer.address);
    await trustRegistry.waitForDeployment();
    const trustRegistryAddress = await trustRegistry.getAddress();
    console.log("✅ TrustScoreRegistry deployed to:", trustRegistryAddress);

    // 3. Deploy Microfinance (Loan Contract)
    console.log("\n📦 Deploying Microfinance...");
    const Microfinance = await hre.ethers.getContractFactory("Microfinance");
    const microfinance = await Microfinance.deploy(identityAddress, trustRegistryAddress, deployer.address);
    await microfinance.waitForDeployment();
    const microfinanceAddress = await microfinance.getAddress();
    console.log("✅ Microfinance deployed to:", microfinanceAddress);

    // 4. Authorize Microfinance in TrustScoreRegistry
    console.log("\n🔐 Authorizing Microfinance in TrustScoreRegistry...");
    const authTx = await trustRegistry.setAuthorized(microfinanceAddress, true);
    await authTx.wait();
    console.log("✅ Authorization complete.");

    // 5. Deploy MockUSDT
    console.log("\n📦 Deploying MockUSDT...");
    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();
    const mockUSDTAddress = await mockUSDT.getAddress();
    console.log("✅ MockUSDT deployed to:", mockUSDTAddress);

    // 6. Deploy LoanAgreementFactory
    console.log("\n📦 Deploying LoanAgreementFactory...");
    const Factory = await hre.ethers.getContractFactory("LoanAgreementFactory");
    const factory = await Factory.deploy(
        identityAddress,
        deployer.address, // Treasury address defaults to deployer
        mockUSDTAddress,
        deployer.address, // Automation service defaults to deployer
        trustRegistryAddress
    );
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("✅ LoanAgreementFactory deployed to:", factoryAddress);

    // 7. Authorize LoanAgreementFactory in TrustScoreRegistry
    console.log("\n🔐 Authorizing LoanAgreementFactory in TrustScoreRegistry...");
    const authFactoryTx = await trustRegistry.setAuthorized(factoryAddress, true);
    await authFactoryTx.wait();
    console.log("✅ Authorization complete.");

    console.log("\n====================================================");
    console.log("🎉 ALL CONTRACTS DEPLOYED SUCCESSFULLY");
    console.log("----------------------------------------------------");
    console.log("Identity:           ", identityAddress);
    console.log("Microfinance:       ", microfinanceAddress);
    console.log("Trust Score:        ", trustRegistryAddress);
    console.log("Mock USDT:          ", mockUSDTAddress);
    console.log("Loan Factory:       ", factoryAddress);
    console.log("====================================================");

    // Save addresses
    const addresses = {
        identity: identityAddress,
        microfinance: microfinanceAddress,
        trustScore: trustRegistryAddress,
        treasury: deployer.address,
        loanFactory: factoryAddress,
        mockUSDT: mockUSDTAddress,
        network: hre.network.name,
        chainId: Number(hre.network.config.chainId || 31337)
    };

    const addressesPath = path.join(__dirname, "../deployedAddresses.json");
    fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
    console.log(`\n📄 Addresses saved to: ${addressesPath}`);

    // Sync to Frontend and Backend
    const frontendContractsDir = path.join(__dirname, "../../frontend/src/contracts");
    const backendContractsDir = path.join(__dirname, "../../backend/contracts");

    [frontendContractsDir, backendContractsDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(path.join(dir, "addresses.json"), JSON.stringify(addresses, null, 2));
    });

    // Sync ABIs
    const contractsToSync = [
        { file: 'Microfinance.sol/Microfinance.json', name: 'Microfinance.json' },
        { file: 'SoulboundIdentity.sol/SoulboundIdentity.json', name: 'SoulboundIdentity.json' },
        { file: 'TrustScoreRegistry.sol/TrustScoreRegistry.json', name: 'TrustScoreRegistry.json' },
        { file: 'MockUSDT.sol/MockUSDT.json', name: 'MockUSDT.json' },
        { file: 'LoanAgreementFactory.sol/LoanAgreementFactory.json', name: 'LoanAgreementFactory.json' },
        { file: 'LoanAgreement.sol/LoanAgreement.json', name: 'LoanAgreement.json' }
    ];

    const artifactsDir = path.join(__dirname, "../artifacts/contracts");

    contractsToSync.forEach(c => {
        const sourcePath = path.join(artifactsDir, c.file);
        if (fs.existsSync(sourcePath)) {
            const artifact = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
            // Frontend format wrapped
            fs.writeFileSync(
                path.join(frontendContractsDir, c.name),
                JSON.stringify({ abi: artifact.abi }, null, 2)
            );
            // Backend format flat array
            fs.writeFileSync(
                path.join(backendContractsDir, c.name),
                JSON.stringify(artifact.abi, null, 2)
            );
            console.log(`✅ Synced ABI: ${c.name}`);
        }
    });

    console.log('🎉 Sync complete!');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed!");
        console.error(error);
        process.exit(1);
    });
