const LoanRequest = require('../models/LoanRequest');
const User = require('../models/User');

// @desc    Create a new loan request (Borrower action)
// @route   POST /api/loans
exports.createLoanRequest = async (req, res) => {
    try {
        const { borrowerId, amountRequested, interestRate, durationMonths, purpose } = req.body;

        // Verify user is an authorized borrower with an NFT
        const user = await User.findById(borrowerId);
        if (!user || user.role !== 'Borrower') {
            return res.status(403).json({ message: 'Only registered borrowers can request loans' });
        }
        if (!user.nftIssued) {
            return res.status(403).json({ message: 'You must complete KYC and mint an Identity NFT first' });
        }

        const loan = await LoanRequest.create({
            borrower: borrowerId,
            amountRequested,
            interestRate,
            durationMonths,
            purpose,
            status: 'Pending'
        });

        res.status(201).json({ success: true, data: loan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all pending loan requests for the Feed (Lender action)
// @route   GET /api/loans
exports.getPendingLoans = async (req, res) => {
    try {
        const loans = await LoanRequest.find({ status: 'Pending' })
            .populate('borrower', 'trustScore walletAddress'); // Only send necessary borrower data

        res.status(200).json({ success: true, count: loans.length, data: loans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Accept and fund a loan request (Lender Action)
// @route   PUT /api/loans/:id/fund
exports.fundLoan = async (req, res) => {
    try {
        const { lenderId } = req.body;
        const loanId = req.params.id;

        const lender = await User.findById(lenderId);
        if (!lender || lender.role !== 'Lender') {
            return res.status(403).json({ message: 'Only registered lenders can fund loans' });
        }

        const loan = await LoanRequest.findById(loanId);
        if (!loan || loan.status !== 'Pending') {
            return res.status(400).json({ message: 'Loan is not available for funding' });
        }

        // Simulate Smart Contract Execution & Insurance Activation:
        const simulatedContractId = `0xSIMULATED${Date.now()}CONTRACT`;

        loan.lender = lenderId;
        loan.status = 'Funded';
        loan.simulatedSmartContractId = simulatedContractId;
        loan.insuranceActivated = true;

        await loan.save();

        // In real life, trigger Ethers.js to move funds from Lender Wallet -> Borrower Wallet

        res.status(200).json({
            success: true,
            message: 'Smart Contract Activated: Funds locked and transferred to borrower. Auto-repayment scheduled.',
            data: loan
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// @desc    Get all loans associated with the logged in user (Borrower or Lender)
// @route   GET /api/loans/my
exports.getUserLoans = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        let query = {};
        if (user.role === 'Borrower') {
            query = { borrower: userId };
        } else if (user.role === 'Lender') {
            query = { lender: userId };
        }

        const loans = await LoanRequest.find(query)
            .populate('borrower', 'name walletAddress trustScore')
            .populate('lender', 'name walletAddress');

        res.status(200).json({ success: true, count: loans.length, data: loans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Sync repayment from frontend to backend
// @route   PUT /api/loans/:id/repay
exports.repayLoan = async (req, res) => {
    try {
        const { txHash } = req.body;
        const loan = await LoanRequest.findById(req.params.id);

        if (!loan) return res.status(404).json({ message: 'Loan not found' });

        loan.status = 'Repaid';
        // In a real app we'd store the txHash in a separate ledger/field
        await loan.save();

        res.status(200).json({ success: true, message: 'Loan status updated to Repaid' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
