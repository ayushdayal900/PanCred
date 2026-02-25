// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ISoulboundIdentity
 * @dev Interface for the Soulbound Identity contract to check for NFT ownership.
 */
interface ISoulboundIdentity {
    function balanceOf(address owner) external view returns (uint256);
}

/**
 * @title ITrustScoreRegistry
 * @dev Interface for the Trust Score contract to increment reputation.
 */
interface ITrustScoreRegistry {
    function increment(address user) external;
}

/**
 * @title Microfinance
 * @dev Refactored peer-to-peer microfinance lending contract that handles a complete 
 * on-chain loan lifecycle for verified users.
 */
contract Microfinance is ReentrancyGuard {
    ISoulboundIdentity public immutable identity;
    ITrustScoreRegistry public immutable trustScore;

    struct Loan {
        uint256 id;
        address borrower;
        address lender;
        uint256 amount;
        uint256 interest;
        uint256 duration;
        bool funded;
        bool repaid;
    }

    uint256 public loanCounter;
    mapping(uint256 => Loan) public loans;

    // Events for tracking a clean loan lifecycle
    event LoanCreated(uint256 indexed id, address indexed borrower, uint256 amount, uint256 interest, uint256 duration);
    event LoanFunded(uint256 indexed id, address indexed lender);
    event LoanRepaid(uint256 indexed id, address indexed borrower);

    constructor(address identityAddress, address trustScoreAddress) {
        identity = ISoulboundIdentity(identityAddress);
        trustScore = ITrustScoreRegistry(trustScoreAddress);
    }

    /**
     * @dev Restricts access to users holding the Soulbound Identity NFT.
     */
    modifier onlyVerifiedUser() {
        require(identity.balanceOf(msg.sender) > 0, "Not verified");
        _;
    }

    /**
     * @dev Creates a new loan request on-chain.
     */
    function createLoan(uint256 _amount, uint256 _interest, uint256 _duration) external onlyVerifiedUser {
        require(_amount > 0, "Invalid amount");
        
        loanCounter++;
        loans[loanCounter] = Loan({
            id: loanCounter,
            borrower: msg.sender,
            lender: address(0),
            amount: _amount,
            interest: _interest,
            duration: _duration,
            funded: false,
            repaid: false
        });

        emit LoanCreated(loanCounter, msg.sender, _amount, _interest, _duration);
    }

    /**
     * @dev Lenders fund a specific loan request. 
     * Principal is transferred directly to the borrower.
     */
    function fundLoan(uint256 _id) external payable onlyVerifiedUser nonReentrant {
        Loan storage loan = loans[_id];
        
        require(loan.id != 0, "Loan does not exist");
        require(!loan.funded, "Already funded");
        require(msg.sender != loan.borrower, "Borrower cannot fund own loan");
        require(msg.value == loan.amount, "Incorrect funding amount");

        loan.lender = msg.sender;
        loan.funded = true;

        // Transfer principal to borrower
        (bool success, ) = payable(loan.borrower).call{value: msg.value}("");
        require(success, "Transfer to borrower failed");

        emit LoanFunded(_id, msg.sender);
    }

    /**
     * @dev Borrowers repay their loan (principal + interest).
     * Funds are transferred directly to the lender.
     */
    function repayLoan(uint256 _id) external payable onlyVerifiedUser nonReentrant {
        Loan storage loan = loans[_id];

        require(loan.funded, "Loan not funded");
        require(!loan.repaid, "Already repaid");
        require(msg.sender == loan.borrower, "Only borrower can repay");

        uint256 total = loan.amount + loan.interest;
        require(msg.value == total, "Incorrect repayment amount");

        loan.repaid = true;

        // Transfer total settlement to lender
        (bool success, ) = payable(loan.lender).call{value: msg.value}("");
        require(success, "Transfer to lender failed");

        // Automate trust score increment
        trustScore.increment(loan.borrower);

        emit LoanRepaid(_id, msg.sender);
    }

    /**
     * @dev Standard getter for frontend integration.
     */
    function getLoanDetails(uint256 _id) external view returns (Loan memory) {
        return loans[_id];
    }
}
