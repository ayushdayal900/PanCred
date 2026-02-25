const { expect } = require("chai");
const hre = require("hardhat");

describe("MyToken", function () {
    it("Should have the correct name and symbol", async function () {
        const [owner] = await hre.ethers.getSigners();
        const MyToken = await hre.ethers.getContractFactory("MyToken");
        const token = await MyToken.deploy(owner.address);
        await token.waitForDeployment();

        expect(await token.name()).to.equal("MyToken");
        expect(await token.symbol()).to.equal("MTK");
    });

    it("Should mint the initial supply to the owner", async function () {
        const [owner] = await hre.ethers.getSigners();
        const MyToken = await hre.ethers.getContractFactory("MyToken");
        const token = await MyToken.deploy(owner.address);
        await token.waitForDeployment();

        const ownerBalance = await token.balanceOf(owner.address);
        const totalSupply = await token.totalSupply();
        expect(ownerBalance).to.equal(totalSupply);
    });
});
