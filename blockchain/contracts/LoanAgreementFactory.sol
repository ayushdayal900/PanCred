// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LoanAgreement.sol";

/**
 * @title IIdentity
 * @dev Interface to verify Soulbound NFT ownership.
 */
interface IIdentity {
    function balanceOf(address owner) external view returns (uint256);
}

/**
 * @title LoanAgreementFactory
 * @dev P2P loan marketplace. Borrowers post loan requests (ads),
 *      lenders fund them — deploying a LoanAgreement contract per loan.
 *      Parallel to the existing Microfinance contract — does NOT replace it.
 */
contract LoanAgreementFactory {
    // --- Config ---
    address public immutable identityContract;
    address public immutable treasury;

    /// @dev Insurance fee = 1% of totalRepayment (100 basis points)
    uint256 public constant INSURANCE_BPS = 100; // 1% in basis points (out of 10_000)

    // --- Loan Requests ---
    struct LoanRequest {
        uint256 id;
        address borrower;
        uint256 principal;
        uint256 totalRepayment;
        uint256 durationInMonths;
        bool funded;
        address agreementAddress;
    }

    uint256 public requestCounter;
    mapping(uint256 => LoanRequest) public loanRequests;

    // Convenience lookups per address
    mapping(address => uint256[]) public borrowerRequestIds;
    mapping(address => address[]) public borrowerAgreements;
    mapping(address => address[]) public lenderAgreements;

    // --- Events ---
    event LoanRequested(
        uint256 indexed id,
        address indexed borrower,
        uint256 principal,
        uint256 totalRepayment,
        uint256 durationInMonths
    );

    event LoanFunded(
        uint256 indexed id,
        address indexed lender,
        address indexed agreementAddress
    );

    // --- Modifier ---
    modifier onlyVerified() {
        require(
            IIdentity(identityContract).balanceOf(msg.sender) > 0,
            "Soulbound Identity NFT required"
        );
        _;
    }

    // --- Constructor ---
    constructor(address _identityContract, address _treasury) {
        require(_identityContract != address(0), "Zero identity address");
        require(_treasury != address(0), "Zero treasury address");
        identityContract = _identityContract;
        treasury = _treasury;
    }

    // --- Core Functions ---

    /**
     * @dev Borrower creates a loan advertisement.
     * @param principal         How much ETH the borrower wants
     * @param totalRepayment    Total ETH the borrower will repay (principal + interest)
     * @param durationInMonths  How many monthly installments
     */
    function createLoanRequest(
        uint256 principal,
        uint256 totalRepayment,
        uint256 durationInMonths
    ) external onlyVerified {
        require(principal > 0, "Principal must be > 0");
        require(totalRepayment >= principal, "Repayment must be >= principal");
        require(durationInMonths > 0 && durationInMonths <= 36, "Duration: 1-36 months");

        requestCounter++;
        loanRequests[requestCounter] = LoanRequest({
            id: requestCounter,
            borrower: msg.sender,
            principal: principal,
            totalRepayment: totalRepayment,
            durationInMonths: durationInMonths,
            funded: false,
            agreementAddress: address(0)
        });

        borrowerRequestIds[msg.sender].push(requestCounter);

        emit LoanRequested(requestCounter, msg.sender, principal, totalRepayment, durationInMonths);
    }

    /**
     * @dev Lender funds a loan request. msg.value must equal the request's principal.
     *      A new LoanAgreement contract is deployed, principal forwarded to borrower.
     * @param requestId ID of the LoanRequest to fund
     */
    function fundLoanRequest(uint256 requestId) external payable onlyVerified {
        LoanRequest storage request = loanRequests[requestId];

        require(request.id != 0, "Request does not exist");
        require(!request.funded, "Already funded");
        require(msg.sender != request.borrower, "Cannot fund own loan");
        require(msg.value == request.principal, "Send exact principal amount");

        request.funded = true;

        // Deploy individual LoanAgreement — forwards principal to borrower in constructor
        LoanAgreement agreement = new LoanAgreement{value: msg.value}(
            request.borrower,
            msg.sender,              // lender
            request.principal,
            request.totalRepayment,
            request.durationInMonths,
            treasury,
            INSURANCE_BPS * request.totalRepayment / 10_000  // 1% of totalRepayment, dynamic
        );

        address agreementAddr = address(agreement);
        request.agreementAddress = agreementAddr;

        borrowerAgreements[request.borrower].push(agreementAddr);
        lenderAgreements[msg.sender].push(agreementAddr);

        emit LoanFunded(requestId, msg.sender, agreementAddr);
    }

    // --- View Functions ---

    /**
     * @dev Returns all loan requests (funded + unfunded). Frontend filters by status.
     */
    function getAllRequests() external view returns (LoanRequest[] memory) {
        if (requestCounter == 0) return new LoanRequest[](0);
        LoanRequest[] memory all = new LoanRequest[](requestCounter);
        for (uint256 i = 1; i <= requestCounter; i++) {
            all[i - 1] = loanRequests[i];
        }
        return all;
    }

    /**
     * @dev Returns agreement contract addresses for a borrower.
     */
    function getBorrowerAgreements(address _borrower) external view returns (address[] memory) {
        return borrowerAgreements[_borrower];
    }

    /**
     * @dev Returns agreement contract addresses for a lender.
     */
    function getLenderAgreements(address _lender) external view returns (address[] memory) {
        return lenderAgreements[_lender];
    }

    /**
     * @dev Convenience: returns a borrower's request IDs.
     */
    function getBorrowerRequestIds(address _borrower) external view returns (uint256[] memory) {
        return borrowerRequestIds[_borrower];
    }
}
