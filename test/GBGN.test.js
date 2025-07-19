const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GBGN Token", function () {
  let gbgn;
  let paxg;
  let owner;
  let user1;
  let user2;
  
  const PAXG_DECIMALS = 18;
  const GBGN_DECIMALS = 18;
  const GBGN_PER_PAXG = 5600;
  const PAXG_FEE_RATE = 20; // 0.02% = 20/100000
  const FEE_DENOMINATOR = 100000;
  
  // Helper function to calculate amount after PAXG fee
  function applyPaxgFee(amount) {
    const fee = amount.mul(PAXG_FEE_RATE).div(FEE_DENOMINATOR);
    return amount.sub(fee);
  }
  
  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock PAXG with transfer fee
    const MockPAXG = await ethers.getContractFactory("contracts/mocks/MockPAXG.sol:MockPAXG");
    paxg = await MockPAXG.deploy();
    await paxg.deployed();
    
    // Deploy GBGN token
    const GBGNToken = await ethers.getContractFactory("GBGNToken");
    gbgn = await GBGNToken.deploy(paxg.address);
    await gbgn.deployed();
    
    // Mint PAXG to users for testing
    await paxg.mint(user1.address, ethers.utils.parseUnits("10", PAXG_DECIMALS));
    await paxg.mint(user2.address, ethers.utils.parseUnits("10", PAXG_DECIMALS));
  });
  
  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await gbgn.name()).to.equal("GBGN Token");
      expect(await gbgn.symbol()).to.equal("GBGN");
    });
    
    it("Should have 18 decimals", async function () {
      expect(await gbgn.decimals()).to.equal(18);
    });
    
    it("Should set the correct PAXG address", async function () {
      expect(await gbgn.paxgToken()).to.equal(paxg.address);
    });
    
    it("Should set the correct exchange rate", async function () {
      expect(await gbgn.GBGN_PER_PAXG()).to.equal(GBGN_PER_PAXG);
    });
  });
  
  describe("Conversion Functions", function () {
    it("Should correctly calculate GBGN amount accounting for PAXG fee", async function () {
      const paxgAmount = ethers.utils.parseUnits("1", PAXG_DECIMALS); // 1 PAXG
      const expectedGbgn = ethers.utils.parseUnits("5598.88", GBGN_DECIMALS); // 5600 * 0.9998
      const actualGbgn = await gbgn.calculateGbgnAmount(paxgAmount);
      
      expect(actualGbgn).to.equal(expectedGbgn);
    });
    
    it("Should correctly calculate PAXG amounts", async function () {
      const gbgnAmount = ethers.utils.parseUnits("5600", GBGN_DECIMALS); // 5600 GBGN
      const [paxgBefore, paxgAfter] = await gbgn.calculatePaxgAmount(gbgnAmount);
      
      expect(paxgBefore).to.equal(ethers.utils.parseUnits("1", PAXG_DECIMALS));
      expect(paxgAfter).to.equal(ethers.utils.parseUnits("0.9998", PAXG_DECIMALS)); // After 0.02% fee
    });
  });
  
  describe("Minting with PAXG Fee", function () {
    it("Should mint GBGN tokens correctly accounting for PAXG transfer fee", async function () {
      const paxgAmount = ethers.utils.parseUnits("1", PAXG_DECIMALS); // 1 PAXG
      const paxgAfterFee = applyPaxgFee(paxgAmount); // 0.9998 PAXG
      const expectedGbgn = paxgAfterFee.mul(GBGN_PER_PAXG); // 5598.88 GBGN
      
      // Approve PAXG spending
      await paxg.connect(user1).approve(gbgn.address, paxgAmount);
      
      // Check initial balances
      const initialPaxgBalance = await paxg.balanceOf(user1.address);
      
      // Mint GBGN
      const tx = await gbgn.connect(user1).mint(paxgAmount);
      const receipt = await tx.wait();
      
      // Find Minted event
      const mintedEvent = receipt.events.find(e => e.event === "Minted");
      expect(mintedEvent).to.not.be.undefined;
      expect(mintedEvent.args.user).to.equal(user1.address);
      expect(mintedEvent.args.paxgAmount).to.equal(paxgAmount);
      expect(mintedEvent.args.gbgnAmount).to.equal(expectedGbgn);
      expect(mintedEvent.args.actualPaxgReceived).to.equal(paxgAfterFee);
      
      // Check balances
      expect(await gbgn.balanceOf(user1.address)).to.equal(expectedGbgn);
      expect(await paxg.balanceOf(user1.address)).to.equal(initialPaxgBalance.sub(paxgAmount));
      expect(await paxg.balanceOf(gbgn.address)).to.equal(paxgAfterFee);
      expect(await gbgn.totalPaxgReserves()).to.equal(paxgAfterFee);
    });
    
    it("Should handle multiple mints correctly", async function () {
      const amount1 = ethers.utils.parseUnits("0.5", PAXG_DECIMALS);
      const amount2 = ethers.utils.parseUnits("1", PAXG_DECIMALS);
      
      // First mint
      await paxg.connect(user1).approve(gbgn.address, amount1.add(amount2));
      await gbgn.connect(user1).mint(amount1);
      
      const reserves1 = await gbgn.totalPaxgReserves();
      
      // Second mint
      await gbgn.connect(user1).mint(amount2);
      
      const reserves2 = await gbgn.totalPaxgReserves();
      const expectedReserves = applyPaxgFee(amount1).add(applyPaxgFee(amount2));
      
      expect(reserves2).to.equal(expectedReserves);
    });
    
    it("Should fail if amount is 0", async function () {
      await expect(gbgn.connect(user1).mint(0))
        .to.be.revertedWith("Amount must be positive");
    });
  });
  
  describe("Redeeming with PAXG Fee", function () {
    beforeEach(async function () {
      // Mint some GBGN first
      const paxgAmount = ethers.utils.parseUnits("1", PAXG_DECIMALS);
      await paxg.connect(user1).approve(gbgn.address, paxgAmount);
      await gbgn.connect(user1).mint(paxgAmount);
    });
    
    it("Should redeem PAXG correctly with transfer fee", async function () {
      const gbgnBalance = await gbgn.balanceOf(user1.address);
      const paxgToReturn = gbgnBalance.div(GBGN_PER_PAXG);
      const expectedPaxgReceived = applyPaxgFee(paxgToReturn);
      
      const initialPaxgBalance = await paxg.balanceOf(user1.address);
      
      // Redeem all GBGN
      const tx = await gbgn.connect(user1).redeem(gbgnBalance);
      const receipt = await tx.wait();
      
      // Find Redeemed event
      const redeemedEvent = receipt.events.find(e => e.event === "Redeemed");
      expect(redeemedEvent).to.not.be.undefined;
      expect(redeemedEvent.args.user).to.equal(user1.address);
      expect(redeemedEvent.args.gbgnAmount).to.equal(gbgnBalance);
      expect(redeemedEvent.args.paxgAmount).to.equal(paxgToReturn);
      expect(redeemedEvent.args.actualPaxgReceived).to.equal(expectedPaxgReceived);
      
      // Check balances
      expect(await gbgn.balanceOf(user1.address)).to.equal(0);
      expect(await paxg.balanceOf(user1.address)).to.equal(initialPaxgBalance.add(expectedPaxgReceived));
      expect(await gbgn.totalPaxgReserves()).to.equal(0);
    });
    
    it("Should handle partial redemptions", async function () {
      const totalGbgn = await gbgn.balanceOf(user1.address);
      const redeemAmount = totalGbgn.div(2); // Redeem half
      
      await gbgn.connect(user1).redeem(redeemAmount);
      
      expect(await gbgn.balanceOf(user1.address)).to.equal(totalGbgn.sub(redeemAmount));
    });
    
    it("Should fail if redeem amount exceeds balance", async function () {
      const balance = await gbgn.balanceOf(user1.address);
      const tooMuch = balance.add(1);
      
      await expect(gbgn.connect(user1).redeem(tooMuch))
        .to.be.revertedWith("Insufficient GBGN balance");
    });
    
    it("Should fail if amount too small", async function () {
      const tinyAmount = ethers.BigNumber.from("5599"); // Less than 1 PAXG worth
      
      await expect(gbgn.connect(user1).redeem(tinyAmount))
        .to.be.revertedWith("Amount too small");
    });
  });
  
  describe("Burn Function", function () {
    beforeEach(async function () {
      // Mint some GBGN first
      const paxgAmount = ethers.utils.parseUnits("1", PAXG_DECIMALS);
      await paxg.connect(user1).approve(gbgn.address, paxgAmount);
      await gbgn.connect(user1).mint(paxgAmount);
    });
    
    it("Should burn tokens without returning PAXG", async function () {
      const burnAmount = ethers.utils.parseUnits("2800", GBGN_DECIMALS); // Half of ~5600
      const initialPaxgBalance = await paxg.balanceOf(user1.address);
      const initialReserves = await gbgn.totalPaxgReserves();
      
      await expect(gbgn.connect(user1).burn(burnAmount))
        .to.emit(gbgn, "TokensBurned")
        .withArgs(user1.address, burnAmount);
      
      // Check that GBGN was burned but PAXG wasn't returned
      expect(await paxg.balanceOf(user1.address)).to.equal(initialPaxgBalance); // No PAXG returned
      expect(await gbgn.totalPaxgReserves()).to.equal(initialReserves); // Reserves unchanged
    });
    
    it("Should improve reserve ratio for remaining holders", async function () {
      // Mint for second user
      await paxg.connect(user2).approve(gbgn.address, ethers.utils.parseUnits("1", PAXG_DECIMALS));
      await gbgn.connect(user2).mint(ethers.utils.parseUnits("1", PAXG_DECIMALS));
      
      // Initial reserve ratio should be ~100%
      let ratio = await gbgn.getReserveRatio();
      expect(ratio).to.be.closeTo(ethers.utils.parseUnits("1", 18), ethers.utils.parseUnits("0.01", 18));
      
      // User1 burns half their tokens
      const user1Balance = await gbgn.balanceOf(user1.address);
      await gbgn.connect(user1).burn(user1Balance.div(2));
      
      // Reserve ratio should now be > 100%
      ratio = await gbgn.getReserveRatio();
      expect(ratio).to.be.gt(ethers.utils.parseUnits("1", 18));
    });
  });
  
  describe("View Functions", function () {
    beforeEach(async function () {
      // Mint some GBGN
      const paxgAmount = ethers.utils.parseUnits("2", PAXG_DECIMALS);
      await paxg.connect(user1).approve(gbgn.address, paxgAmount);
      await gbgn.connect(user1).mint(paxgAmount);
    });
    
    it("Should correctly report PAXG balance", async function () {
      const contractBalance = await gbgn.getPaxgBalance();
      const reserves = await gbgn.totalPaxgReserves();
      expect(contractBalance).to.equal(reserves);
    });
    
    it("Should correctly calculate reserve ratio", async function () {
      const ratio = await gbgn.getReserveRatio();
      // Should be approximately 100% (allowing for PAXG fee effects)
      expect(ratio).to.be.closeTo(ethers.utils.parseUnits("1", 18), ethers.utils.parseUnits("0.01", 18));
    });
    
    it("Should correctly report over-collateralization", async function () {
      let result = await gbgn.checkOverCollateralization();
      expect(result.isOverCollateralized).to.be.false;
      
      // User burns some tokens to create over-collateralization
      const burnAmount = ethers.utils.parseUnits("5600", GBGN_DECIMALS); // 1 PAXG worth
      await gbgn.connect(user1).burn(burnAmount);
      
      result = await gbgn.checkOverCollateralization();
      expect(result.isOverCollateralized).to.be.true;
      expect(result.excessReserves).to.be.gt(0);
    });
  });
  
  describe("Edge Cases", function () {
    it("Should handle very small mints correctly", async function () {
      const smallPaxg = ethers.utils.parseUnits("0.0001", PAXG_DECIMALS);
      await paxg.connect(user1).approve(gbgn.address, smallPaxg);
      
      const expectedGbgn = await gbgn.calculateGbgnAmount(smallPaxg);
      expect(expectedGbgn).to.be.gt(0);
      
      await gbgn.connect(user1).mint(smallPaxg);
      
      // Balance should be slightly less than smallPaxg * 5600 due to fee
      const balance = await gbgn.balanceOf(user1.address);
      expect(balance).to.be.closeTo(expectedGbgn, ethers.utils.parseUnits("0.01", GBGN_DECIMALS));
    });
    
    it("Should handle exact exchange amounts", async function () {
      // Mint exactly enough for 1 PAXG worth of GBGN (accounting for fee)
      const targetGbgn = ethers.utils.parseUnits("5600", GBGN_DECIMALS);
      const requiredPaxg = ethers.utils.parseUnits("1.0002", PAXG_DECIMALS); // Slightly more to account for fee
      
      await paxg.connect(user1).approve(gbgn.address, requiredPaxg);
      await gbgn.connect(user1).mint(requiredPaxg);
      
      const balance = await gbgn.balanceOf(user1.address);
      // Should be close to 5600 GBGN
      expect(balance).to.be.closeTo(targetGbgn, ethers.utils.parseUnits("1", GBGN_DECIMALS));
    });
  });
});

// Mock PAXG contract for testing (with transfer fee)
const mockPAXGSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockPAXG is ERC20 {
    uint256 public constant FEE_RATE = 20; // 0.02% = 20/100000
    uint256 public constant FEE_DENOMINATOR = 100000;
    
    constructor() ERC20("Paxos Gold", "PAXG") {}
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    function _transfer(address from, address to, uint256 amount) internal override {
        uint256 fee = (amount * FEE_RATE) / FEE_DENOMINATOR;
        uint256 amountAfterFee = amount - fee;
        
        super._transfer(from, to, amountAfterFee);
        if (fee > 0) {
            super._transfer(from, address(0), fee); // Burn the fee
        }
    }
    
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }
}
`;