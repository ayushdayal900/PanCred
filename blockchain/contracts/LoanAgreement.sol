// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LoanAgreement
 * @dev Individual loan contract deployed per funded request.
 *      Enforces installment-based repayment with insurance fee routing.
 */
contract LoanAgreement {
    address public immutable borrower;
    address public immutable lender;
    address public immutable treasury;

    uint256 public immutable principal;
    uint256 public immutable totalRepayment;
    uint256 public immutable durationInMonths;
    uint256 public immutable monthlyPayment;
    uint256 public immutable insuranceFeePerInstallment;

    uint256 public paymentsMade;
    uint256 public nextDueTimestamp;
    bool public completed;

    event InstallmentPaid(
        address indexed borrower,
        uint256 indexed installmentNumber,
        uint256 amountPaid,
        uint256 lenderAmount,
        uint256 insuranceCut,
        uint256 timestamp
    );
    event LoanCompleted(address indexed borrower, address indexed lender, uint256 timestamp);

    /**
     * @param _borrower         Address of the borrower
     * @param _lender           Address of the lender
     * @param _principal        Loan principal in wei
     * @param _totalRepayment   Total amount borrower must repay (principal + interest)
     * @param _durationInMonths Number of monthly installments
     * @param _treasury         Address that receives insurance fees
     * @param _insuranceFee     Total insurance fee (e.g. 0.01 ETH), split across installments
     *
     * msg.value must equal _principal — it is immediately forwarded to borrower.
     */
    constructor(
        address _borrower,
        address _lender,
        uint256 _principal,
        uint256 _totalRepayment,
        uint256 _durationInMonths,
        address _treasury,
        uint256 _insuranceFee
    ) payable {
        require(_borrower != address(0), "Zero borrower");
        require(_lender != address(0), "Zero lender");
        require(_durationInMonths > 0, "Invalid duration");
        require(_totalRepayment >= _principal, "Invalid repayment");
        require(msg.value == _principal, "Must forward principal");

        borrower = _borrower;
        lender = _lender;
        treasury = _treasury;
        principal = _principal;
        totalRepayment = _totalRepayment;
        durationInMonths = _durationInMonths;
        monthlyPayment = _totalRepayment / _durationInMonths;
        insuranceFeePerInstallment = _insuranceFee / _durationInMonths;

        // First payment allowed immediately (borrower can start paying from day 0)
        nextDueTimestamp = block.timestamp;

        // Forward principal to borrower right away
        (bool ok, ) = payable(_borrower).call{value: msg.value}("");
        require(ok, "Principal transfer to borrower failed");
    }

    /**
     * @dev Borrower pays one monthly installment.
     *      Each payment = monthlyPayment; lender gets (payment - insuranceCut), treasury gets insuranceCut.
     */
    function payInstallment() external payable {
        require(msg.sender == borrower, "Only borrower can pay");
        require(!completed, "Loan already completed");
        require(paymentsMade < durationInMonths, "All payments already made");
        require(block.timestamp >= nextDueTimestamp, "Next payment not due yet");
        require(msg.value == monthlyPayment, "Incorrect installment amount");

        uint256 insuranceCut = insuranceFeePerInstallment;
        uint256 lenderAmount = msg.value - insuranceCut;

        paymentsMade++;
        nextDueTimestamp += 30 days;

        // Transfer to lender
        (bool ok1, ) = payable(lender).call{value: lenderAmount}("");
        require(ok1, "Transfer to lender failed");

        // Transfer insurance cut to treasury
        if (insuranceCut > 0) {
            (bool ok2, ) = payable(treasury).call{value: insuranceCut}("");
            require(ok2, "Insurance transfer failed");
        }

        emit InstallmentPaid(borrower, paymentsMade, msg.value, lenderAmount, insuranceCut, block.timestamp);

        if (paymentsMade == durationInMonths) {
            completed = true;
            emit LoanCompleted(borrower, lender, block.timestamp);
        }
    }

    /**
     * @dev Returns full status of this agreement for dashboard display.
     */
    function getStatus() external view returns (
        uint256 _paymentsMade,
        uint256 _totalDuration,
        uint256 _nextDueTimestamp,
        uint256 _monthlyPayment,
        uint256 _remainingPayments,
        bool _completed
    ) {
        return (
            paymentsMade,
            durationInMonths,
            nextDueTimestamp,
            monthlyPayment,
            durationInMonths - paymentsMade,
            completed
        );
    }
}
