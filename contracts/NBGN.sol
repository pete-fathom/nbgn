// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title NBGN - New Bulgarian Lev Stablecoin
 * @dev Euro-pegged stablecoin backed by EURe with fixed conversion rate
 * @notice 1 EUR = 1.95583 NBGN (Bulgarian Lev official rate)
 */
contract NBGN is 
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // Constants
    uint256 private constant CONVERSION_RATE = 195583; // 1 EUR = 1.95583 NBGN (scaled by 100000)
    uint256 private constant RATE_PRECISION = 100000;
    uint256 private constant DECIMAL_DIFFERENCE = 1; // 18 - 18 = 0 decimal places difference (both tokens use 18 decimals)
    
    // EURe token address on Arbitrum One
    address private constant EURE_ADDRESS = 0x0c06cCF38114ddfc35e07427B9424adcca9F44F8;
    
    // State variables
    IERC20Metadata public eureToken;
    uint256 public totalCollateral;
    
    // Events
    event Mint(address indexed user, uint256 eureAmount, uint256 nbgnAmount);
    event Redeem(address indexed user, uint256 nbgnAmount, uint256 eureAmount);
    event CollateralDeposited(uint256 amount);
    event CollateralWithdrawn(uint256 amount);
    event EmergencyWithdraw(address indexed token, uint256 amount);

    // Errors
    error InvalidAmount();
    error InsufficientCollateral();
    error TransferFailed();
    error ZeroAddress();
    error InvalidCollateralToken();

    /**
     * @dev Initializes the contract
     * @param _owner Address that will own the contract
     */
    function initialize(address _owner) public initializer {
        if (_owner == address(0)) revert ZeroAddress();
        
        __ERC20_init("New Bulgarian Lev", "NBGN");
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        
        eureToken = IERC20Metadata(EURE_ADDRESS);
        
        // Verify EURe contract exists and has correct decimals (only on non-test networks)
        if (block.chainid == 42161) { // Only check on Arbitrum One
            try eureToken.decimals() returns (uint8 decimals) {
                if (decimals != 18) revert InvalidCollateralToken(); // EURe uses 18 decimals
            } catch {
                revert InvalidCollateralToken();
            }
        }
    }

    /**
     * @dev Mints NBGN tokens by depositing EURe
     * @param _eureAmount Amount of EURe to deposit
     * @return nbgnAmount Amount of NBGN minted
     */
    function mint(uint256 _eureAmount) external nonReentrant whenNotPaused returns (uint256 nbgnAmount) {
        if (_eureAmount == 0) revert InvalidAmount();
        
        // Calculate NBGN amount: 1 EUR = 1.95583 NBGN
        // Both EURe and NBGN use 18 decimals, so no decimal conversion needed
        // Apply conversion rate: 1 EURe = 1.95583 NBGN
        nbgnAmount = (_eureAmount * DECIMAL_DIFFERENCE * CONVERSION_RATE) / RATE_PRECISION;
        
        // Transfer EURe from user to contract
        if (!eureToken.transferFrom(msg.sender, address(this), _eureAmount)) {
            revert TransferFailed();
        }
        
        // Update collateral tracking
        totalCollateral += _eureAmount;
        
        // Mint NBGN tokens to user
        _mint(msg.sender, nbgnAmount);
        
        emit Mint(msg.sender, _eureAmount, nbgnAmount);
    }

    /**
     * @dev Redeems NBGN tokens for EURe
     * @param _nbgnAmount Amount of NBGN to redeem
     * @return eureAmount Amount of EURe returned
     */
    function redeem(uint256 _nbgnAmount) external nonReentrant whenNotPaused returns (uint256 eureAmount) {
        if (_nbgnAmount == 0) revert InvalidAmount();
        if (balanceOf(msg.sender) < _nbgnAmount) revert InvalidAmount();
        
        // Calculate EURe amount: 1.95583 NBGN = 1 EUR
        // Both EURe and NBGN use 18 decimals, so no decimal conversion needed
        // Apply conversion rate: 1.95583 NBGN = 1 EURe
        eureAmount = (_nbgnAmount * RATE_PRECISION) / (CONVERSION_RATE * DECIMAL_DIFFERENCE);
        
        // Check collateral availability
        if (totalCollateral < eureAmount) revert InsufficientCollateral();
        
        // Burn NBGN tokens
        _burn(msg.sender, _nbgnAmount);
        
        // Update collateral tracking
        totalCollateral -= eureAmount;
        
        // Transfer EURe to user
        if (!eureToken.transfer(msg.sender, eureAmount)) {
            revert TransferFailed();
        }
        
        emit Redeem(msg.sender, _nbgnAmount, eureAmount);
    }

    /**
     * @dev Calculates NBGN amount for given EURe amount
     * @param _eureAmount Amount of EURe (18 decimals)
     * @return NBGN amount (18 decimals)
     */
    function calculateNBGN(uint256 _eureAmount) external pure returns (uint256) {
        return (_eureAmount * DECIMAL_DIFFERENCE * CONVERSION_RATE) / RATE_PRECISION;
    }

    /**
     * @dev Calculates EURe amount for given NBGN amount
     * @param _nbgnAmount Amount of NBGN (18 decimals)
     * @return EURe amount (18 decimals)
     */
    function calculateEURe(uint256 _nbgnAmount) external pure returns (uint256) {
        return (_nbgnAmount * RATE_PRECISION) / (CONVERSION_RATE * DECIMAL_DIFFERENCE);
    }

    /**
     * @dev Returns the conversion rate (1 EUR = X NBGN)
     */
    function getConversionRate() external pure returns (uint256, uint256) {
        return (CONVERSION_RATE, RATE_PRECISION);
    }

    /**
     * @dev Pauses the contract - only owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses the contract - only owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdrawal function - only owner
     * @param _token Token address to withdraw
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        if (_token == address(0)) revert ZeroAddress();
        if (_amount == 0) revert InvalidAmount();
        
        IERC20Metadata token = IERC20Metadata(_token);
        if (!token.transfer(owner(), _amount)) {
            revert TransferFailed();
        }
        
        emit EmergencyWithdraw(_token, _amount);
    }

    /**
     * @dev Get total collateral balance
     */
    function getCollateralBalance() external view returns (uint256) {
        return eureToken.balanceOf(address(this));
    }

    /**
     * @dev Authorizes contract upgrades - only owner
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Override required by Solidity
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        super._update(from, to, value);
    }
}