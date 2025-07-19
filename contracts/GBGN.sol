// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GBGN Token - Fully Decentralized
 * @notice ERC-20 token pegged to PAXG (Pax Gold) at 1 PAXG = 5600 GBGN
 * @dev Non-upgradeable, no admin functions, purely algorithmic
 * @dev Handles PAXG's 0.02% transfer fee automatically
 */
contract GBGNToken is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Fixed exchange rate: 1 PAXG = 5600 GBGN
    // Using 18 decimals precision (same as PAXG)
    uint256 public constant GBGN_PER_PAXG = 5600;
    uint256 public constant PRECISION = 1e18;
    
    // State variables
    IERC20 public immutable paxgToken;
    uint256 public totalPaxgReserves;
    
    // Events
    event Minted(address indexed user, uint256 paxgAmount, uint256 gbgnAmount, uint256 actualPaxgReceived);
    event Redeemed(address indexed user, uint256 gbgnAmount, uint256 paxgAmount, uint256 actualPaxgReceived);
    event TokensBurned(address indexed user, uint256 amount);
    
    /**
     * @notice Contract constructor
     * @param _paxgToken Address of the PAXG token on Ethereum mainnet
     */
    constructor(address _paxgToken) ERC20("GBGN Token", "GBGN") {
        require(_paxgToken != address(0), "Invalid PAXG address");
        paxgToken = IERC20(_paxgToken);
    }
    
    /**
     * @notice Mint GBGN tokens by depositing PAXG
     * @dev Accounts for PAXG's 0.02% transfer fee
     * @param paxgAmount Amount of PAXG to deposit (before fees)
     * @return gbgnAmount Amount of GBGN tokens minted
     */
    function mint(uint256 paxgAmount) external nonReentrant returns (uint256 gbgnAmount) {
        require(paxgAmount > 0, "Amount must be positive");
        
        // Record balance before transfer to account for PAXG fee
        uint256 balanceBefore = paxgToken.balanceOf(address(this));
        
        // Transfer PAXG from user (will incur 0.02% fee)
        paxgToken.safeTransferFrom(msg.sender, address(this), paxgAmount);
        
        // Calculate actual PAXG received after fee
        uint256 balanceAfter = paxgToken.balanceOf(address(this));
        uint256 actualPaxgReceived = balanceAfter - balanceBefore;
        require(actualPaxgReceived > 0, "No PAXG received");
        
        // Calculate GBGN amount based on actual PAXG received
        gbgnAmount = actualPaxgReceived * GBGN_PER_PAXG;
        require(gbgnAmount > 0, "Amount too small");
        
        // Update reserves
        totalPaxgReserves += actualPaxgReceived;
        
        // Mint GBGN tokens
        _mint(msg.sender, gbgnAmount);
        
        emit Minted(msg.sender, paxgAmount, gbgnAmount, actualPaxgReceived);
    }
    
    /**
     * @notice Redeem PAXG by burning GBGN tokens
     * @dev The PAXG received will be less due to PAXG's 0.02% transfer fee
     * @param gbgnAmount Amount of GBGN to burn
     * @return paxgAmount Amount of PAXG returned (before fees)
     */
    function redeem(uint256 gbgnAmount) external nonReentrant returns (uint256 paxgAmount) {
        require(gbgnAmount > 0, "Amount must be positive");
        require(balanceOf(msg.sender) >= gbgnAmount, "Insufficient GBGN balance");
        
        // Calculate PAXG amount: gbgnAmount / GBGN_PER_PAXG
        paxgAmount = gbgnAmount / GBGN_PER_PAXG;
        require(paxgAmount > 0, "Amount too small");
        require(totalPaxgReserves >= paxgAmount, "Insufficient reserves");
        
        // Burn GBGN tokens
        _burn(msg.sender, gbgnAmount);
        
        // Update reserves
        totalPaxgReserves -= paxgAmount;
        
        // Record user's balance before transfer
        uint256 userBalanceBefore = paxgToken.balanceOf(msg.sender);
        
        // Transfer PAXG to user (will incur 0.02% fee)
        paxgToken.safeTransfer(msg.sender, paxgAmount);
        
        // Calculate actual PAXG received by user
        uint256 userBalanceAfter = paxgToken.balanceOf(msg.sender);
        uint256 actualPaxgReceived = userBalanceAfter - userBalanceBefore;
        
        emit Redeemed(msg.sender, gbgnAmount, paxgAmount, actualPaxgReceived);
    }
    
    /**
     * @notice Burn your own GBGN tokens without receiving PAXG back
     * @dev This improves the reserve ratio for all remaining token holders
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Burn GBGN tokens without returning PAXG
        // This leaves more PAXG reserves for the remaining GBGN supply
        _burn(msg.sender, amount);
        
        emit TokensBurned(msg.sender, amount);
    }
    
    /**
     * @notice Calculate GBGN amount for given PAXG amount (accounting for fees)
     * @param paxgAmount Amount of PAXG (before fees)
     * @return gbgnAmount Equivalent GBGN amount (after accounting for PAXG fee)
     */
    function calculateGbgnAmount(uint256 paxgAmount) external pure returns (uint256 gbgnAmount) {
        // Account for PAXG's 0.02% transfer fee
        uint256 paxgAfterFee = (paxgAmount * 9998) / 10000; // 99.98% of original
        gbgnAmount = paxgAfterFee * GBGN_PER_PAXG;
    }
    
    /**
     * @notice Calculate PAXG amount for given GBGN amount
     * @param gbgnAmount Amount of GBGN
     * @return paxgBeforeFee PAXG amount before fees
     * @return paxgAfterFee Estimated PAXG amount after fees
     */
    function calculatePaxgAmount(uint256 gbgnAmount) external pure returns (uint256 paxgBeforeFee, uint256 paxgAfterFee) {
        paxgBeforeFee = gbgnAmount / GBGN_PER_PAXG;
        // Account for PAXG's 0.02% transfer fee on redemption
        paxgAfterFee = (paxgBeforeFee * 9998) / 10000; // 99.98% of original
    }
    
    /**
     * @notice Get current reserve ratio
     * @return ratio Reserve ratio with 18 decimal precision (1e18 = 100%)
     */
    function getReserveRatio() external view returns (uint256 ratio) {
        uint256 supply = totalSupply();
        if (supply == 0) return PRECISION;
        
        // Calculate expected reserves for current supply
        uint256 expectedReserves = supply / GBGN_PER_PAXG;
        
        // Calculate actual ratio
        if (expectedReserves == 0) return 0;
        ratio = (totalPaxgReserves * PRECISION) / expectedReserves;
    }
    
    /**
     * @notice Check if contract is over-collateralized
     * @return isOverCollateralized True if reserves exceed required amount
     * @return excessReserves Amount of excess reserves in PAXG
     */
    function checkOverCollateralization() external view returns (bool isOverCollateralized, uint256 excessReserves) {
        uint256 supply = totalSupply();
        uint256 requiredReserves = supply / GBGN_PER_PAXG;
        
        isOverCollateralized = totalPaxgReserves > requiredReserves;
        excessReserves = isOverCollateralized ? totalPaxgReserves - requiredReserves : 0;
    }
    
    /**
     * @notice Get the actual PAXG balance held by this contract
     * @dev Useful for verifying reserves match actual balance
     * @return balance The PAXG balance of this contract
     */
    function getPaxgBalance() external view returns (uint256 balance) {
        return paxgToken.balanceOf(address(this));
    }
}