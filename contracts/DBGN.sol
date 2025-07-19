// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DBGN Token - Fully Decentralized
 * @notice ERC-20 token pegged to USDC at 0.60 USDC per DBGN
 * @dev Non-upgradeable, no admin functions, purely algorithmic
 */
contract DBGNToken is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Fixed exchange rate: 1 DBGN = 0.60 USDC
    // Using 18 decimals precision for DBGN, USDC has 6 decimals
    // 0.60 USDC = 600000 (6 decimals)
    // To convert: 1 USDC = 1.666... DBGN
    uint256 public constant USDC_PER_DBGN = 600000000000000000; // 0.60 * 10^18
    uint256 public constant PRECISION = 1e18;
    
    // State variables
    IERC20 public immutable usdcToken;
    uint256 public totalUsdcReserves;
    
    // Events
    event Minted(address indexed user, uint256 usdcAmount, uint256 dbgnAmount);
    event Redeemed(address indexed user, uint256 dbgnAmount, uint256 usdcAmount);
    event TokensBurned(address indexed user, uint256 amount);
    
    /**
     * @notice Contract constructor
     * @param _usdcToken Address of the USDC token on Arbitrum
     */
    constructor(address _usdcToken) ERC20("DBGN Token", "DBGN") {
        require(_usdcToken != address(0), "Invalid USDC address");
        usdcToken = IERC20(_usdcToken);
    }
    
    /**
     * @notice Mint DBGN tokens by depositing USDC
     * @param usdcAmount Amount of USDC to deposit (6 decimals)
     * @return dbgnAmount Amount of DBGN tokens minted (18 decimals)
     */
    function mint(uint256 usdcAmount) external nonReentrant returns (uint256 dbgnAmount) {
        require(usdcAmount > 0, "Amount must be positive");
        
        // Calculate DBGN amount: usdcAmount * PRECISION / USDC_PER_DBGN
        // Since USDC has 6 decimals and DBGN has 18, we need to adjust
        dbgnAmount = (usdcAmount * 1e12 * PRECISION) / USDC_PER_DBGN;
        require(dbgnAmount > 0, "Amount too small");
        
        // Transfer USDC from user
        usdcToken.safeTransferFrom(msg.sender, address(this), usdcAmount);
        
        // Update reserves
        totalUsdcReserves += usdcAmount;
        
        // Mint DBGN tokens
        _mint(msg.sender, dbgnAmount);
        
        emit Minted(msg.sender, usdcAmount, dbgnAmount);
    }
    
    /**
     * @notice Redeem USDC by burning DBGN tokens
     * @param dbgnAmount Amount of DBGN to burn (18 decimals)
     * @return usdcAmount Amount of USDC returned (6 decimals)
     */
    function redeem(uint256 dbgnAmount) external nonReentrant returns (uint256 usdcAmount) {
        require(dbgnAmount > 0, "Amount must be positive");
        require(balanceOf(msg.sender) >= dbgnAmount, "Insufficient DBGN balance");
        
        // Calculate USDC amount: dbgnAmount * USDC_PER_DBGN / PRECISION
        // Convert from 18 decimals to 6 decimals
        usdcAmount = (dbgnAmount * USDC_PER_DBGN) / (PRECISION * 1e12);
        require(usdcAmount > 0, "Amount too small");
        require(totalUsdcReserves >= usdcAmount, "Insufficient reserves");
        
        // Burn DBGN tokens
        _burn(msg.sender, dbgnAmount);
        
        // Update reserves
        totalUsdcReserves -= usdcAmount;
        
        // Transfer USDC to user
        usdcToken.safeTransfer(msg.sender, usdcAmount);
        
        emit Redeemed(msg.sender, dbgnAmount, usdcAmount);
    }
    
    /**
     * @notice Burn your own DBGN tokens without receiving USDC back
     * @dev This improves the reserve ratio for all remaining token holders
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Burn DBGN tokens without returning USDC
        // This leaves more USDC reserves for the remaining DBGN supply
        _burn(msg.sender, amount);
        
        emit TokensBurned(msg.sender, amount);
    }
    
    /**
     * @notice Calculate DBGN amount for given USDC amount
     * @param usdcAmount Amount of USDC (6 decimals)
     * @return dbgnAmount Equivalent DBGN amount (18 decimals)
     */
    function calculateDbgnAmount(uint256 usdcAmount) external pure returns (uint256 dbgnAmount) {
        dbgnAmount = (usdcAmount * 1e12 * PRECISION) / USDC_PER_DBGN;
    }
    
    /**
     * @notice Calculate USDC amount for given DBGN amount
     * @param dbgnAmount Amount of DBGN (18 decimals)
     * @return usdcAmount Equivalent USDC amount (6 decimals)
     */
    function calculateUsdcAmount(uint256 dbgnAmount) external pure returns (uint256 usdcAmount) {
        usdcAmount = (dbgnAmount * USDC_PER_DBGN) / (PRECISION * 1e12);
    }
    
    /**
     * @notice Get current reserve ratio
     * @return ratio Reserve ratio with 18 decimal precision (1e18 = 100%)
     */
    function getReserveRatio() external view returns (uint256 ratio) {
        uint256 supply = totalSupply();
        if (supply == 0) return PRECISION;
        
        // Calculate expected reserves for current supply
        uint256 expectedReserves = (supply * USDC_PER_DBGN) / (PRECISION * 1e12);
        
        // Calculate actual ratio
        ratio = (totalUsdcReserves * PRECISION) / expectedReserves;
    }
    
    /**
     * @notice Check if contract is over-collateralized
     * @return isOverCollateralized True if reserves exceed required amount
     * @return excessReserves Amount of excess reserves in USDC
     */
    function checkOverCollateralization() external view returns (bool isOverCollateralized, uint256 excessReserves) {
        uint256 supply = totalSupply();
        uint256 requiredReserves = (supply * USDC_PER_DBGN) / (PRECISION * 1e12);
        
        isOverCollateralized = totalUsdcReserves > requiredReserves;
        excessReserves = isOverCollateralized ? totalUsdcReserves - requiredReserves : 0;
    }
}