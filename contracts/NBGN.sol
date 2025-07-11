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
 * @dev Euro-pegged stablecoin backed by EURC with fixed conversion rate
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
    uint256 private constant DECIMAL_DIFFERENCE = 10**12; // 18 - 6 = 12 decimal places difference
    
    // EURC token address on Ethereum mainnet
    address private constant EURC_ADDRESS = 0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c;
    
    // State variables
    IERC20Metadata public eurcToken;
    uint256 public totalCollateral;
    
    // Events
    event Mint(address indexed user, uint256 eurcAmount, uint256 nbgnAmount);
    event Redeem(address indexed user, uint256 nbgnAmount, uint256 eurcAmount);
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
        
        eurcToken = IERC20Metadata(EURC_ADDRESS);
        
        // Verify EURC contract exists and has correct decimals (only on non-test networks)
        if (block.chainid == 1) { // Only check on mainnet
            try eurcToken.decimals() returns (uint8 decimals) {
                if (decimals != 6) revert InvalidCollateralToken();
            } catch {
                revert InvalidCollateralToken();
            }
        }
    }

    /**
     * @dev Mints NBGN tokens by depositing EURC
     * @param _eurcAmount Amount of EURC to deposit
     * @return nbgnAmount Amount of NBGN minted
     */
    function mint(uint256 _eurcAmount) external nonReentrant whenNotPaused returns (uint256 nbgnAmount) {
        if (_eurcAmount == 0) revert InvalidAmount();
        
        // Calculate NBGN amount: 1 EUR = 1.95583 NBGN
        // Convert EURC (6 decimals) to NBGN (18 decimals): multiply by 10^12
        // Then apply conversion rate: 1 EURC = 1.95583 NBGN
        nbgnAmount = (_eurcAmount * DECIMAL_DIFFERENCE * CONVERSION_RATE) / RATE_PRECISION;
        
        // Transfer EURC from user to contract
        if (!eurcToken.transferFrom(msg.sender, address(this), _eurcAmount)) {
            revert TransferFailed();
        }
        
        // Update collateral tracking
        totalCollateral += _eurcAmount;
        
        // Mint NBGN tokens to user
        _mint(msg.sender, nbgnAmount);
        
        emit Mint(msg.sender, _eurcAmount, nbgnAmount);
    }

    /**
     * @dev Redeems NBGN tokens for EURC
     * @param _nbgnAmount Amount of NBGN to redeem
     * @return eurcAmount Amount of EURC returned
     */
    function redeem(uint256 _nbgnAmount) external nonReentrant whenNotPaused returns (uint256 eurcAmount) {
        if (_nbgnAmount == 0) revert InvalidAmount();
        if (balanceOf(msg.sender) < _nbgnAmount) revert InvalidAmount();
        
        // Calculate EURC amount: 1.95583 NBGN = 1 EUR
        // Convert NBGN (18 decimals) to EURC (6 decimals): divide by 10^12
        // Then apply conversion rate: 1.95583 NBGN = 1 EURC
        eurcAmount = (_nbgnAmount * RATE_PRECISION) / (CONVERSION_RATE * DECIMAL_DIFFERENCE);
        
        // Check collateral availability
        if (totalCollateral < eurcAmount) revert InsufficientCollateral();
        
        // Burn NBGN tokens
        _burn(msg.sender, _nbgnAmount);
        
        // Update collateral tracking
        totalCollateral -= eurcAmount;
        
        // Transfer EURC to user
        if (!eurcToken.transfer(msg.sender, eurcAmount)) {
            revert TransferFailed();
        }
        
        emit Redeem(msg.sender, _nbgnAmount, eurcAmount);
    }

    /**
     * @dev Calculates NBGN amount for given EURC amount
     * @param _eurcAmount Amount of EURC (6 decimals)
     * @return NBGN amount (18 decimals)
     */
    function calculateNBGN(uint256 _eurcAmount) external pure returns (uint256) {
        return (_eurcAmount * DECIMAL_DIFFERENCE * CONVERSION_RATE) / RATE_PRECISION;
    }

    /**
     * @dev Calculates EURC amount for given NBGN amount
     * @param _nbgnAmount Amount of NBGN (18 decimals)
     * @return EURC amount (6 decimals)
     */
    function calculateEURC(uint256 _nbgnAmount) external pure returns (uint256) {
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
        return eurcToken.balanceOf(address(this));
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