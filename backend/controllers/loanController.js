const LoanRequest = require('../models/LoanRequest');
const User = require('../models/User');
const { updateTrustScore } = require('../services/blockchainService');

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

        // ── Trust Score: Lender gets +50 for first loan funded, +10 for subsequent ──
        try {
            const lenderLoanCount = await LoanRequest.countDocuments({ lender: lenderId, status: { $in: ['Funded', 'Repaid'] } });
            // lenderLoanCount is now 1+ (current loan is already saved as Funded)
            const isFirstFund = lenderLoanCount === 1;
            const scoreChange = isFirstFund ? 50 : 10;
            const reason = 'Funded a Loan';
            await updateTrustScore(lenderId, scoreChange, reason, loan._id, {
                loanId: loan._id.toString(),
                isFirstFund
            });
            console.log(`[TrustScore] Lender ${lenderId} +${scoreChange} (${isFirstFund ? 'first fund bonus' : 'subsequent fund'})`);
        } catch (tsErr) {
            console.error('[TrustScore] Lender update failed (non-critical):', tsErr.message);
        }

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
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Unassigned users have no loans to show yet
        if (user.role === 'Unassigned') {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }

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
        console.error('[getUserLoans] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};


// @desc    Sync repayment from frontend to backend
// @route   PUT /api/loans/:id/repay
exports.repayLoan = async (req, res) => {
    try {
        const { txHash } = req.body;
        const loan = await LoanRequest.findById(req.params.id).populate('borrower');

        if (!loan) return res.status(404).json({ message: 'Loan not found' });

        loan.status = 'Repaid';
        loan.repaymentTxHash = txHash || null;
        await loan.save();

        // ── Trust Score: Borrower gets +75 on successful repayment ──
        if (loan.borrower && loan.borrower._id) {
            try {
                const borrowerRepaidCount = await LoanRequest.countDocuments({
                    borrower: loan.borrower._id,
                    status: 'Repaid'
                });
                // +100 for first repayment (milestone), +75 for subsequent
                const isFirstRepayment = borrowerRepaidCount === 1;
                const scoreChange = isFirstRepayment ? 100 : 75;
                await updateTrustScore(
                    loan.borrower._id,
                    scoreChange,
                    'Successful Repayment',
                    loan._id,
                    { txHash, isFirstRepayment, onChainLoanId: loan.simulatedSmartContractId }
                );
                console.log(`[TrustScore] Borrower ${loan.borrower._id} +${scoreChange} (${isFirstRepayment ? 'first repayment bonus' : 'subsequent repayment'})`);
            } catch (tsErr) {
                console.error('[TrustScore] Borrower update failed (non-critical):', tsErr.message);
            }
        }

        res.status(200).json({ success: true, message: 'Loan status updated to Repaid' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

