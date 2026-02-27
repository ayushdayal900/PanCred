const express = require('express');
const router = express.Router();
const { createLoanRequest, getPendingLoans, fundLoan, getUserLoans, repayLoan, getBorrowerAds, getLenderUpcomingPayments } = require('../controllers/loanController');
const { protect } = require('../middleware/authMiddleware');

// Loan Request & Funding Flow
router.post('/', protect, createLoanRequest);
router.get('/', getPendingLoans);
router.get('/my', protect, getUserLoans);
router.get('/my-ads', protect, getBorrowerAds);
router.get('/lender/upcoming-payments', protect, getLenderUpcomingPayments);
router.put('/:id/fund', protect, fundLoan);
router.put('/:id/repay', protect, repayLoan);

module.exports = router;
