// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockPAXG
 * @dev Mock PAXG contract that simulates the 0.02% transfer fee
 */
contract MockPAXG is ERC20 {
    uint256 public constant FEE_RATE = 20; // 0.02% = 20/100000
    uint256 public constant FEE_DENOMINATOR = 100000;
    
    constructor() ERC20("Paxos Gold", "PAXG") {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function _update(address from, address to, uint256 value) internal virtual override {
        if (from != address(0) && to != address(0)) {
            // Apply fee on transfers (not mints or burns)
            uint256 fee = (value * FEE_RATE) / FEE_DENOMINATOR;
            uint256 amountAfterFee = value - fee;
            
            super._update(from, to, amountAfterFee);
            if (fee > 0) {
                super._update(from, address(0), fee); // Burn the fee
            }
        } else {
            // No fee on mints or burns
            super._update(from, to, value);
        }
    }
    
}