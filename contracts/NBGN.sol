// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NBGN Token - Fully Decentralized
 * @notice ERC-20 token pegged to Bulgarian Lev (BGN) at the official EUR:BGN rate
 * @dev Non-upgradeable, no admin functions, purely algorithmic
 */
contract NBGNToken is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Official EUR:BGN peg rate (1 EUR = 1.95583 BGN)
    // Using 18 decimals precision: 1.95583 * 10^18
    uint256 public constant BGN_PER_EUR = 1955830000000000000;
    uint256 public constant PRECISION = 1e18;
    
    // State variables
    IERC20 public immutable eureToken;
    uint256 public totalEureReserves;
    
    // Events
    event Minted(address indexed user, uint256 eureAmount, uint256 nbgnAmount);
    event Redeemed(address indexed user, uint256 nbgnAmount, uint256 eureAmount);
    event TokensBurned(address indexed user, uint256 amount);
    
    /**
     * @notice Contract constructor
     * @param _eureToken Address of the EURe token on Arbitrum
     */
    constructor(address _eureToken) ERC20("NBGN Token", "NBGN") {
        require(_eureToken != address(0), "Invalid EURe address");
        eureToken = IERC20(_eureToken);
    }
    
    /**
     * @notice Mint NBGN tokens by depositing EURe
     * @param eureAmount Amount of EURe to deposit
     * @return nbgnAmount Amount of NBGN tokens minted
     */
    function mint(uint256 eureAmount) external nonReentrant returns (uint256 nbgnAmount) {
        require(eureAmount > 0, "Amount must be positive");
        
        // Calculate NBGN amount: eureAmount * BGN_PER_EUR / PRECISION
        nbgnAmount = (eureAmount * BGN_PER_EUR) / PRECISION;
        require(nbgnAmount > 0, "Amount too small");
        
        // Transfer EURe from user
        eureToken.safeTransferFrom(msg.sender, address(this), eureAmount);
        
        // Update reserves
        totalEureReserves += eureAmount;
        
        // Mint NBGN tokens
        _mint(msg.sender, nbgnAmount);
        
        emit Minted(msg.sender, eureAmount, nbgnAmount);
    }
    
    /**
     * @notice Redeem EURe by burning NBGN tokens
     * @param nbgnAmount Amount of NBGN to burn
     * @return eureAmount Amount of EURe returned
     */
    function redeem(uint256 nbgnAmount) external nonReentrant returns (uint256 eureAmount) {
        require(nbgnAmount > 0, "Amount must be positive");
        require(balanceOf(msg.sender) >= nbgnAmount, "Insufficient NBGN balance");
        
        // Calculate EURe amount: nbgnAmount * PRECISION / BGN_PER_EUR
        eureAmount = (nbgnAmount * PRECISION) / BGN_PER_EUR;
        require(eureAmount > 0, "Amount too small");
        require(totalEureReserves >= eureAmount, "Insufficient reserves");
        
        // Burn NBGN tokens
        _burn(msg.sender, nbgnAmount);
        
        // Update reserves
        totalEureReserves -= eureAmount;
        
        // Transfer EURe to user
        eureToken.safeTransfer(msg.sender, eureAmount);
        
        emit Redeemed(msg.sender, nbgnAmount, eureAmount);
    }
    
    /**
     * @notice Burn your own NBGN tokens without receiving EURe back
     * @dev This improves the reserve ratio for all remaining token holders
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Burn NBGN tokens without returning EURe
        // This leaves more EURe reserves for the remaining NBGN supply
        _burn(msg.sender, amount);
        
        emit TokensBurned(msg.sender, amount);
    }
    
    /**
     * @notice Calculate NBGN amount for given EURe amount
     * @param eureAmount Amount of EURe
     * @return nbgnAmount Equivalent NBGN amount
     */
    function calculateNbgnAmount(uint256 eureAmount) external pure returns (uint256 nbgnAmount) {
        nbgnAmount = (eureAmount * BGN_PER_EUR) / PRECISION;
    }
    
    /**
     * @notice Calculate EURe amount for given NBGN amount
     * @param nbgnAmount Amount of NBGN
     * @return eureAmount Equivalent EURe amount
     */
    function calculateEureAmount(uint256 nbgnAmount) external pure returns (uint256 eureAmount) {
        eureAmount = (nbgnAmount * PRECISION) / BGN_PER_EUR;
    }
    
    /**
     * @notice Get current reserve ratio
     * @return ratio Reserve ratio with 18 decimal precision (1e18 = 100%)
     */
    function getReserveRatio() external view returns (uint256 ratio) {
        uint256 supply = totalSupply();
        if (supply == 0) return PRECISION;
        
        // Calculate expected reserves for current supply
        uint256 expectedReserves = (supply * PRECISION) / BGN_PER_EUR;
        
        // Calculate actual ratio
        ratio = (totalEureReserves * PRECISION) / expectedReserves;
    }
    
    /**
     * @notice Check if contract is over-collateralized
     * @return isOverCollateralized True if reserves exceed required amount
     * @return excessReserves Amount of excess reserves in EURe
     */
    function checkOverCollateralization() external view returns (bool isOverCollateralized, uint256 excessReserves) {
        uint256 supply = totalSupply();
        uint256 requiredReserves = (supply * PRECISION) / BGN_PER_EUR;
        
        isOverCollateralized = totalEureReserves > requiredReserves;
        excessReserves = isOverCollateralized ? totalEureReserves - requiredReserves : 0;
    }
}
