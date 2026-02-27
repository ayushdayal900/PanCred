// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ── Minimal interface for TrustScoreRegistry ──────────────────────────────────
interface ITrustScoreRegistry {
    function penalize(address user, uint256 amount) external;
    function setAuthorized(address addr, bool status) external;
}

contract LoanAgreement is ReentrancyGuard {

    // ── Constants & Enums ──────────────────────────────────────────────────────
    uint256 public constant REPAYMENT_INTERVAL = 30 days;
    uint256 public constant GRACE_PERIOD       = 5 days;
    uint256 public constant PENALTY_POINTS     = 50;

    enum LoanStatus { Active, Completed, Defaulted }

    // ── Immutables ─────────────────────────────────────────────────────────────
    address public immutable borrower;
    address public immutable lender;
    address public immutable treasury;

    IERC20               public immutable token;
    ITrustScoreRegistry  public immutable trustRegistry;
    address              public immutable automationService;

    uint256 public immutable principal;
    uint256 public immutable totalRepayment;
    uint256 public immutable durationInMonths;
    uint256 public immutable monthlyPayment;
    uint256 public immutable insuranceFeePerInstallment;

    // ── Mutable State ──────────────────────────────────────────────────────────
    uint256 public paymentsMade;
    uint256 public nextDueTimestamp;
    uint256 public missedPayments;
    
    // Legacy support for frontend mapping
    bool public completed; 
    bool public defaulted;
    bool public isPaused;

    // ── Events ─────────────────────────────────────────────────────────────────
    event InstallmentPaid(
        address indexed borrower,
        uint256 indexed installmentNumber,
        uint256 amountPaid,
        uint256 lenderAmount,
        uint256 insuranceCut,
        uint256 timestamp
    );

    event LoanCompleted(address indexed borrower, address indexed lender, uint256 timestamp);
    
    event LoanDefaulted(address indexed borrower, address indexed lender, uint256 timestamp);

    event InstallmentMissed(
        address indexed borrower,
        uint256 cyclesMissed,
        bool    paymentFailed,
        uint256 timestamp
    );

    // ── Constructor ────────────────────────────────────────────────────────────
    constructor(
        address _borrower,
        address _lender,
        uint256 _principal,
        uint256 _totalRepayment,
        uint256 _durationInMonths,
        address _treasury,
        uint256 _insuranceFee,
        address _token,
        address _automationService,
        address _trustRegistry
    ) payable {
        require(_borrower          != address(0), "Zero borrower");
        require(_lender            != address(0), "Zero lender");
        require(_token             != address(0), "Zero token");
        require(_treasury          != address(0), "Zero treasury");
        require(_automationService != address(0), "Zero admin");
        require(_trustRegistry     != address(0), "Zero trust registry");
        require(_durationInMonths  > 0,           "Invalid duration");
        require(_totalRepayment    >= _principal, "Repayment < principal");
        require(msg.value          == _principal, "Must forward exact principal");

        borrower          = _borrower;
        lender            = _lender;
        treasury          = _treasury;
        token             = IERC20(_token);
        trustRegistry     = ITrustScoreRegistry(_trustRegistry);
        automationService = _automationService;
        principal         = _principal;
        totalRepayment    = _totalRepayment;
        durationInMonths  = _durationInMonths;
        monthlyPayment    = _totalRepayment / _durationInMonths;
        insuranceFeePerInstallment = _insuranceFee / _durationInMonths;

        nextDueTimestamp = block.timestamp;

        // Forward ETH principal to borrower
        (bool ok, ) = payable(_borrower).call{value: msg.value}("");
        require(ok, "Principal transfer failed");
    }

    // ── Emergency Admin ────────────────────────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == automationService || msg.sender == treasury, "Not admin");
        _;
    }

    function pauseLoan() external onlyAdmin {
        isPaused = true;
    }

    function unpauseLoan() external onlyAdmin {
        isPaused = false;
    }

    // ── Core Repayment ─────────────────────────────────────────────────────────

    function repayInstallment() external nonReentrant {
        require(msg.sender == borrower || msg.sender == automationService || msg.sender == lender, "Not authorized");
        require(!isPaused, "Loan is paused");
        require(!completed, "Loan already completed");
        require(!defaulted, "Loan is defaulted");
        require(paymentsMade < durationInMonths, "All payments already made");
        require(block.timestamp >= nextDueTimestamp, "Not due yet");

        // Detect overdue cycles
        uint256 overdueBy = block.timestamp - nextDueTimestamp;
        if (overdueBy > GRACE_PERIOD) {
            uint256 lateCycles = (overdueBy - GRACE_PERIOD) / REPAYMENT_INTERVAL;
            if (lateCycles > 0) {
                missedPayments += lateCycles;
                emit InstallmentMissed(borrower, lateCycles, false, block.timestamp);
            }
        }

        if (missedPayments > 3) {
            defaulted = true;
            emit LoanDefaulted(borrower, lender, block.timestamp);
            return;
        }

        // Advance timestamp
        nextDueTimestamp += REPAYMENT_INTERVAL;

        uint256 insuranceCut = insuranceFeePerInstallment;
        uint256 lenderAmount = monthlyPayment - insuranceCut;

        // Transfers
        bool transferOk = _tryTransferFrom(borrower, lender, lenderAmount);

        if (!transferOk) {
            missedPayments++;
            emit InstallmentMissed(borrower, 1, true, block.timestamp);
            
            if (missedPayments > 3) {
                defaulted = true;
                emit LoanDefaulted(borrower, lender, block.timestamp);
            }

            // On-chain trust penalty 
            try trustRegistry.penalize(borrower, PENALTY_POINTS) {} catch {}
            return;
        }

        // Insurance cut
        if (insuranceCut > 0) {
            _tryTransferFrom(borrower, treasury, insuranceCut);
        }

        paymentsMade++;
        emit InstallmentPaid(borrower, paymentsMade, monthlyPayment, lenderAmount, insuranceCut, block.timestamp);

        if (paymentsMade == durationInMonths) {
            completed = true;
            emit LoanCompleted(borrower, lender, block.timestamp);
        }
    }

    function _tryTransferFrom(address from, address to, uint256 amount) internal returns (bool) {
        try token.transferFrom(from, to, amount) returns (bool ok) {
            return ok;
        } catch {
            return false;
        }
    }

    // ── User Required View Functions ───────────────────────────────────────────

    function getRemainingBalance() external view returns (uint256) {
        return (durationInMonths - paymentsMade) * monthlyPayment;
    }

    function getNextDueDate() external view returns (uint256) {
        return nextDueTimestamp;
    }

    function getInstallmentAmount() external view returns (uint256) {
        return monthlyPayment;
    }

    function getMissedPayments() external view returns (uint256) {
        return missedPayments;
    }

    function getLoanStatus() external view returns (LoanStatus) {
        if (completed) return LoanStatus.Completed;
        if (defaulted || missedPayments > 3) return LoanStatus.Defaulted;
        return LoanStatus.Active;
    }

    // ── Legacy Status (Maintains Frontend compatibility) ───────────────────────

    function getStatus() external view returns (
        uint256 _paymentsMade,
        uint256 _totalDuration,
        uint256 _nextDueTimestamp,
        uint256 _monthlyPayment,
        uint256 _remainingPayments,
        bool    _completed,
        uint256 _missedPayments,
        bool    _isOverdue,
        uint256 _borrowerAllowance
    ) {
        return (
            paymentsMade,
            durationInMonths,
            nextDueTimestamp,
            monthlyPayment,
            durationInMonths - paymentsMade,
            completed,
            missedPayments,
            !completed && block.timestamp > nextDueTimestamp + GRACE_PERIOD,
            token.allowance(borrower, address(this))
        );
    }
}
