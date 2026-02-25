const express = require('express');
const router = express.Router();
const { createLoanRequest, getPendingLoans, fundLoan, getUserLoans, repayLoan } = require('../controllers/loanController');
const { protect } = require('../middleware/authMiddleware');

// Loan Request & Funding Flow
router.post('/', protect, createLoanRequest);
router.get('/', getPendingLoans);
router.get('/my', protect, getUserLoans);
router.put('/:id/fund', protect, fundLoan);
router.put('/:id/repay', protect, repayLoan);

module.exports = router;

