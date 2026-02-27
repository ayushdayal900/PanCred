// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDT
 * @dev A testnet ERC-20 token that mimics USDT for development and demo purposes.
 *      - Decimals: 6 (matches real USDT)
 *      - Public mint function available for testnet faucet use
 *      - Constructor mints 1,000,000 tUSDT to the deployer
 *
 * DO NOT use in production. Testnet only.
 */
contract MockUSDT is ERC20 {
    uint8 private constant _DECIMALS = 6;

    /**
     * @dev Deploys the token and mints 1,000,000 tUSDT to the deployer.
     *      1,000,000 tokens = 1_000_000 * 10^6 raw units.
     */
    constructor() ERC20("Test USDT", "tUSDT") {
        _mint(msg.sender, 1_000_000 * (10 ** _DECIMALS));
    }

    /**
     * @dev Public mint function — allows anyone to mint tUSDT for testing.
     *      This would be restricted (e.g., onlyOwner) in production.
     * @param to     Recipient address
     * @param amount Amount in raw units (already accounts for decimals)
     */
    function mint(address to, uint256 amount) external {
        require(to != address(0), "MockUSDT: mint to zero address");
        require(amount > 0, "MockUSDT: amount must be > 0");
        _mint(to, amount);
    }

    /**
     * @dev Override decimals to return 6 (matching real USDT).
     */
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }
}
