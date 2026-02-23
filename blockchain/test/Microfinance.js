const { expect } = require("chai");
const hre = require("hardhat");

describe("Microfinance", function () {
    let microfinance;
    let borrower;
    let lender;
    let other;

    const loanAmount = hre.ethers.parseEther("1.0");
    const repaymentAmount = hre.ethers.parseEther("1.1");
    const duration = 3600; // 1 hour

    beforeEach(async function () {
        [borrower, lender, other] = await hre.ethers.getSigners();
        const Microfinance = await hre.ethers.getContractFactory("Microfinance");
        microfinance = await Microfinance.deploy();
        await microfinance.waitForDeployment();
    });

    it("Should create a loan request", async function () {
        await expect(microfinance.connect(borrower).createLoan(repaymentAmount, duration, { value: loanAmount }))
            .to.emit(microfinance, "LoanCreated")
            .withArgs(1, borrower.address, loanAmount, repaymentAmount);

        const loan = await microfinance.getLoanDetails(1);
        expect(loan.borrower).to.equal(borrower.address);
        expect(loan.amount).to.equal(loanAmount);
        expect(loan.repaymentAmount).to.equal(repaymentAmount);
    });

    it("Should fund a loan and transfer funds to borrower", async function () {
        await microfinance.connect(borrower).createLoan(repaymentAmount, duration, { value: loanAmount });

        const borrowerBalanceBefore = await hre.ethers.provider.getBalance(borrower.address);

        await expect(microfinance.connect(lender).fundLoan(1, { value: loanAmount }))
            .to.emit(microfinance, "LoanFunded");

        const borrowerBalanceAfter = await hre.ethers.provider.getBalance(borrower.address);
        // Balance should increase by loanAmount (minus some gas for previous calls if we were precise, but here it's fresh)
        expect(borrowerBalanceAfter - borrowerBalanceBefore).to.equal(loanAmount);

        const loan = await microfinance.getLoanDetails(1);
        expect(loan.lender).to.equal(lender.address);
        expect(loan.active).to.be.true;
    });

    it("Should repay a loan and transfer funds to lender", async function () {
        await microfinance.connect(borrower).createLoan(repaymentAmount, duration, { value: loanAmount });
        await microfinance.connect(lender).fundLoan(1, { value: loanAmount });

        const lenderBalanceBefore = await hre.ethers.provider.getBalance(lender.address);

        await expect(microfinance.connect(borrower).repayLoan(1, { value: repaymentAmount }))
            .to.emit(microfinance, "LoanRepaid");

        const lenderBalanceAfter = await hre.ethers.provider.getBalance(lender.address);
        expect(lenderBalanceAfter - lenderBalanceBefore).to.equal(repaymentAmount);

        const loan = await microfinance.getLoanDetails(1);
        expect(loan.repaid).to.be.true;
        expect(loan.active).to.be.false;
    });

    it("Should fail if repayment amount is incorrect", async function () {
        await microfinance.connect(borrower).createLoan(repaymentAmount, duration, { value: loanAmount });
        await microfinance.connect(lender).fundLoan(1, { value: loanAmount });

        await expect(microfinance.connect(borrower).repayLoan(1, { value: hre.ethers.parseEther("0.5") }))
            .to.be.revertedWithCustomError(microfinance, "Loan_InsufficientFunds");
    });
});
