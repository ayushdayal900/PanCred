// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Microfinance
 * @dev A peer-to-peer microfinance lending contract that handles loan lifecycles.
 * It allows borrowers to request loans and lenders to fund them.
 * Repayments are automatically routed back to the lender.
 */
contract Microfinance is ReentrancyGuard {
    struct Loan {
        uint256 loanId;
        address borrower;
        address payable lender;
        uint256 amount;
        uint256 repaymentAmount;
        uint256 duration;
        uint256 startTime;
        bool repaid;
        bool active;
    }

    uint256 private _loanCount;
    mapping(uint256 => Loan) public loans;

    // Events for tracking loan lifecycle
    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 repaymentAmount);
    event LoanFunded(uint256 indexed loanId, address indexed lender, uint256 startTime);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount);

    // Custom errors for efficiency
    error Loan_InvalidAmount();
    error Loan_InvalidRepayment();
    error Loan_NotActive();
    error Loan_AlreadyFunded();
    error Loan_DoesNotExist();
    error Loan_InsufficientFunds();
    error Loan_Unauthorized();
    error Loan_AlreadyRepaid();

    /**
     * @dev Borrowers call this to request a loan.
     * They specify the repayment amount (principal + interest) and duration.
     * @param repaymentAmount Total amount to be repaid to the lender.
     * @param duration Estimated time for repayment (in seconds).
     */
    function createLoan(uint256 repaymentAmount, uint256 duration) external payable returns (uint256) {
        if (msg.value == 0) revert Loan_InvalidAmount();
        if (repaymentAmount <= msg.value) revert Loan_InvalidRepayment();

        _loanCount++;
        uint256 loanId = _loanCount;

        loans[loanId] = Loan({
            loanId: loanId,
            borrower: msg.sender,
            lender: payable(address(0)),
            amount: msg.value,
            repaymentAmount: repaymentAmount,
            duration: duration,
            startTime: 0,
            repaid: false,
            active: false
        });

        emit LoanCreated(loanId, msg.sender, msg.value, repaymentAmount);
        return loanId;
    }

    /**
     * @dev Lenders call this to fund a specific loan request.
     * The funding amount must match the loan's original requested amount.
     * @param loanId The ID of the loan to fund.
     */
    function fundLoan(uint256 loanId) external payable nonReentrant {
        Loan storage loan = loans[loanId];

        if (loan.loanId == 0) revert Loan_DoesNotExist();
        if (loan.active || loan.lender != address(0)) revert Loan_AlreadyFunded();
        if (msg.value != loan.amount) revert Loan_InsufficientFunds();

        loan.lender = payable(msg.sender);
        loan.startTime = block.timestamp;
        loan.active = true;

        // Transfer the funding from the lender to the borrower
        (bool success, ) = payable(loan.borrower).call{value: msg.value}("");
        require(success, "Transfer to borrower failed");

        emit LoanFunded(loanId, msg.sender, block.timestamp);
    }

    /**
     * @dev Borrowers call this to repay their loan.
     * The repayment amount is immediately sent to the lender.
     * @param loanId The ID of the loan being repaid.
     */
    function repayLoan(uint256 loanId) external payable nonReentrant {
        Loan storage loan = loans[loanId];

        if (!loan.active) revert Loan_NotActive();
        if (loan.repaid) revert Loan_AlreadyRepaid();
        if (msg.value != loan.repaymentAmount) revert Loan_InsufficientFunds();
        if (msg.sender != loan.borrower) revert Loan_Unauthorized();

        loan.repaid = true;
        loan.active = false;

        // Automatically transfer repayment + interest back to the lender
        (bool success, ) = loan.lender.call{value: msg.value}("");
        require(success, "Transfer to lender failed");

        emit LoanRepaid(loanId, msg.sender, msg.value);
    }

    /**
     * @dev Helper function to get detailed information about a loan.
     * @param loanId The ID of the loan.
     */
    function getLoanDetails(uint256 loanId) external view returns (Loan memory) {
        if (loans[loanId].loanId == 0) revert Loan_DoesNotExist();
        return loans[loanId];
    }
}
