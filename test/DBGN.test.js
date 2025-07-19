const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DBGN Token", function () {
  let dbgn;
  let usdc;
  let owner;
  let user1;
  let user2;
  
  const USDC_DECIMALS = 6;
  const DBGN_DECIMALS = 18;
  
  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", USDC_DECIMALS);
    await usdc.deployed();
    
    // Deploy DBGN token
    const DBGNToken = await ethers.getContractFactory("DBGNToken");
    dbgn = await DBGNToken.deploy(usdc.address);
    await dbgn.deployed();
    
    // Mint USDC to users for testing
    await usdc.mint(user1.address, ethers.utils.parseUnits("10000", USDC_DECIMALS));
    await usdc.mint(user2.address, ethers.utils.parseUnits("10000", USDC_DECIMALS));
  });
  
  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await dbgn.name()).to.equal("DBGN Token");
      expect(await dbgn.symbol()).to.equal("DBGN");
    });
    
    it("Should have 18 decimals", async function () {
      expect(await dbgn.decimals()).to.equal(18);
    });
    
    it("Should set the correct USDC address", async function () {
      expect(await dbgn.usdcToken()).to.equal(usdc.address);
    });
    
    it("Should set the correct exchange rate constant", async function () {
      const usdcPerDbgn = await dbgn.USDC_PER_DBGN();
      // 0.60 * 10^18
      expect(usdcPerDbgn).to.equal(ethers.utils.parseUnits("0.6", 18));
    });
  });
  
  describe("Conversion Functions", function () {
    it("Should correctly convert USDC to DBGN", async function () {
      const usdcAmount = ethers.utils.parseUnits("60", USDC_DECIMALS); // 60 USDC
      const expectedDbgn = ethers.utils.parseUnits("100", DBGN_DECIMALS); // 100 DBGN
      const actualDbgn = await dbgn.calculateDbgnAmount(usdcAmount);
      
      expect(actualDbgn).to.equal(expectedDbgn);
    });
    
    it("Should correctly convert DBGN to USDC", async function () {
      const dbgnAmount = ethers.utils.parseUnits("100", DBGN_DECIMALS); // 100 DBGN
      const expectedUsdc = ethers.utils.parseUnits("60", USDC_DECIMALS); // 60 USDC
      const actualUsdc = await dbgn.calculateUsdcAmount(dbgnAmount);
      
      expect(actualUsdc).to.equal(expectedUsdc);
    });
    
    it("Should handle fractional conversions correctly", async function () {
      // 1 USDC should give 1.666... DBGN
      const oneUsdc = ethers.utils.parseUnits("1", USDC_DECIMALS);
      const expectedDbgn = ethers.utils.parseUnits("1.666666666666666666", DBGN_DECIMALS);
      const actualDbgn = await dbgn.calculateDbgnAmount(oneUsdc);
      
      // Allow for small rounding differences
      expect(actualDbgn).to.be.closeTo(expectedDbgn, ethers.utils.parseUnits("0.000000000000000001", DBGN_DECIMALS));
    });
  });
  
  describe("Minting", function () {
    it("Should mint DBGN tokens correctly", async function () {
      const usdcAmount = ethers.utils.parseUnits("60", USDC_DECIMALS); // 60 USDC
      const expectedDbgn = ethers.utils.parseUnits("100", DBGN_DECIMALS); // 100 DBGN
      
      // Approve USDC spending
      await usdc.connect(user1).approve(dbgn.address, usdcAmount);
      
      // Mint DBGN
      await expect(dbgn.connect(user1).mint(usdcAmount))
        .to.emit(dbgn, "Minted")
        .withArgs(user1.address, usdcAmount, expectedDbgn);
      
      // Check balances
      expect(await dbgn.balanceOf(user1.address)).to.equal(expectedDbgn);
      expect(await usdc.balanceOf(dbgn.address)).to.equal(usdcAmount);
      expect(await dbgn.totalUsdcReserves()).to.equal(usdcAmount);
    });
    
    it("Should fail if amount is 0", async function () {
      await expect(dbgn.connect(user1).mint(0))
        .to.be.revertedWith("Amount must be positive");
    });
    
    it("Should fail if user has insufficient USDC", async function () {
      const tooMuch = ethers.utils.parseUnits("20000", USDC_DECIMALS);
      await usdc.connect(user1).approve(dbgn.address, tooMuch);
      
      await expect(dbgn.connect(user1).mint(tooMuch))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
    
    it("Should handle multiple mints correctly", async function () {
      const amount1 = ethers.utils.parseUnits("30", USDC_DECIMALS); // 30 USDC -> 50 DBGN
      const amount2 = ethers.utils.parseUnits("60", USDC_DECIMALS); // 60 USDC -> 100 DBGN
      
      // First mint
      await usdc.connect(user1).approve(dbgn.address, amount1.add(amount2));
      await dbgn.connect(user1).mint(amount1);
      
      // Second mint
      await dbgn.connect(user1).mint(amount2);
      
      // Check final balances
      const totalDbgn = ethers.utils.parseUnits("150", DBGN_DECIMALS);
      expect(await dbgn.balanceOf(user1.address)).to.equal(totalDbgn);
      expect(await dbgn.totalUsdcReserves()).to.equal(amount1.add(amount2));
    });
  });
  
  describe("Redeeming", function () {
    beforeEach(async function () {
      // Mint some DBGN first
      const usdcAmount = ethers.utils.parseUnits("60", USDC_DECIMALS);
      await usdc.connect(user1).approve(dbgn.address, usdcAmount);
      await dbgn.connect(user1).mint(usdcAmount);
    });
    
    it("Should redeem USDC correctly", async function () {
      const dbgnAmount = ethers.utils.parseUnits("100", DBGN_DECIMALS); // 100 DBGN
      const expectedUsdc = ethers.utils.parseUnits("60", USDC_DECIMALS); // 60 USDC
      
      const initialUsdcBalance = await usdc.balanceOf(user1.address);
      
      await expect(dbgn.connect(user1).redeem(dbgnAmount))
        .to.emit(dbgn, "Redeemed")
        .withArgs(user1.address, dbgnAmount, expectedUsdc);
      
      // Check balances
      expect(await dbgn.balanceOf(user1.address)).to.equal(0);
      expect(await usdc.balanceOf(user1.address)).to.equal(initialUsdcBalance.add(expectedUsdc));
      expect(await dbgn.totalUsdcReserves()).to.equal(0);
    });
    
    it("Should handle partial redemptions", async function () {
      const redeemAmount = ethers.utils.parseUnits("50", DBGN_DECIMALS); // 50 DBGN
      const expectedUsdc = ethers.utils.parseUnits("30", USDC_DECIMALS); // 30 USDC
      
      await dbgn.connect(user1).redeem(redeemAmount);
      
      // Check remaining balances
      expect(await dbgn.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("50", DBGN_DECIMALS));
      expect(await dbgn.totalUsdcReserves()).to.equal(ethers.utils.parseUnits("30", USDC_DECIMALS));
    });
    
    it("Should fail if redeem amount exceeds balance", async function () {
      const tooMuch = ethers.utils.parseUnits("200", DBGN_DECIMALS);
      
      await expect(dbgn.connect(user1).redeem(tooMuch))
        .to.be.revertedWith("Insufficient DBGN balance");
    });
    
    it("Should fail if reserves are insufficient", async function () {
      // This shouldn't happen in normal operation, but test it anyway
      // Would require a bug or exploit to get here
      const dbgnAmount = ethers.utils.parseUnits("100", DBGN_DECIMALS);
      
      // Manually set reserves to 0 by having another user mint and redeem
      await usdc.connect(user2).approve(dbgn.address, ethers.utils.parseUnits("60", USDC_DECIMALS));
      await dbgn.connect(user2).mint(ethers.utils.parseUnits("60", USDC_DECIMALS));
      await dbgn.connect(user2).redeem(ethers.utils.parseUnits("100", DBGN_DECIMALS));
      
      // Now user1 tries to redeem but reserves are depleted
      await expect(dbgn.connect(user1).redeem(dbgnAmount))
        .to.be.revertedWith("Insufficient reserves");
    });
  });
  
  describe("Burn Function", function () {
    beforeEach(async function () {
      // Mint some DBGN first
      const usdcAmount = ethers.utils.parseUnits("60", USDC_DECIMALS);
      await usdc.connect(user1).approve(dbgn.address, usdcAmount);
      await dbgn.connect(user1).mint(usdcAmount);
    });
    
    it("Should burn tokens without returning USDC", async function () {
      const burnAmount = ethers.utils.parseUnits("50", DBGN_DECIMALS);
      const initialUsdcBalance = await usdc.balanceOf(user1.address);
      const initialReserves = await dbgn.totalUsdcReserves();
      
      await expect(dbgn.connect(user1).burn(burnAmount))
        .to.emit(dbgn, "TokensBurned")
        .withArgs(user1.address, burnAmount);
      
      // Check that DBGN was burned but USDC wasn't returned
      expect(await dbgn.balanceOf(user1.address)).to.equal(ethers.utils.parseUnits("50", DBGN_DECIMALS));
      expect(await usdc.balanceOf(user1.address)).to.equal(initialUsdcBalance); // No USDC returned
      expect(await dbgn.totalUsdcReserves()).to.equal(initialReserves); // Reserves unchanged
    });
    
    it("Should improve reserve ratio for remaining holders", async function () {
      // Mint for second user
      await usdc.connect(user2).approve(dbgn.address, ethers.utils.parseUnits("60", USDC_DECIMALS));
      await dbgn.connect(user2).mint(ethers.utils.parseUnits("60", USDC_DECIMALS));
      
      // Initial reserve ratio should be 100%
      let ratio = await dbgn.getReserveRatio();
      expect(ratio).to.equal(ethers.utils.parseUnits("1", 18));
      
      // User1 burns half their tokens
      await dbgn.connect(user1).burn(ethers.utils.parseUnits("50", DBGN_DECIMALS));
      
      // Reserve ratio should now be > 100%
      ratio = await dbgn.getReserveRatio();
      expect(ratio).to.be.gt(ethers.utils.parseUnits("1", 18));
    });
    
    it("Should fail if burn amount exceeds balance", async function () {
      await expect(dbgn.connect(user1).burn(ethers.utils.parseUnits("200", DBGN_DECIMALS)))
        .to.be.revertedWith("Insufficient balance");
    });
  });
  
  describe("View Functions", function () {
    beforeEach(async function () {
      // Mint some DBGN
      const usdcAmount = ethers.utils.parseUnits("60", USDC_DECIMALS);
      await usdc.connect(user1).approve(dbgn.address, usdcAmount);
      await dbgn.connect(user1).mint(usdcAmount);
    });
    
    it("Should correctly calculate reserve ratio", async function () {
      const ratio = await dbgn.getReserveRatio();
      expect(ratio).to.equal(ethers.utils.parseUnits("1", 18)); // 100%
    });
    
    it("Should correctly report over-collateralization", async function () {
      let result = await dbgn.checkOverCollateralization();
      expect(result.isOverCollateralized).to.be.false;
      expect(result.excessReserves).to.equal(0);
      
      // User burns some tokens to create over-collateralization
      await dbgn.connect(user1).burn(ethers.utils.parseUnits("50", DBGN_DECIMALS));
      
      result = await dbgn.checkOverCollateralization();
      expect(result.isOverCollateralized).to.be.true;
      expect(result.excessReserves).to.equal(ethers.utils.parseUnits("30", USDC_DECIMALS));
    });
    
    it("Should return 100% ratio when supply is 0", async function () {
      // Redeem all tokens
      await dbgn.connect(user1).redeem(ethers.utils.parseUnits("100", DBGN_DECIMALS));
      
      const ratio = await dbgn.getReserveRatio();
      expect(ratio).to.equal(ethers.utils.parseUnits("1", 18));
    });
  });
  
  describe("Edge Cases", function () {
    it("Should handle very small amounts correctly", async function () {
      const smallUsdc = ethers.BigNumber.from("600000"); // 0.6 USDC (minimum for 1 DBGN)
      await usdc.connect(user1).approve(dbgn.address, smallUsdc);
      
      const dbgnReceived = await dbgn.calculateDbgnAmount(smallUsdc);
      expect(dbgnReceived).to.equal(ethers.utils.parseUnits("1", 18)); // Exactly 1 DBGN
      
      await dbgn.connect(user1).mint(smallUsdc);
      expect(await dbgn.balanceOf(user1.address)).to.equal(dbgnReceived);
    });
    
    it("Should reject amounts that are too small", async function () {
      const tooSmall = ethers.BigNumber.from("1"); // 0.000001 USDC
      await usdc.connect(user1).approve(dbgn.address, tooSmall);
      
      await expect(dbgn.connect(user1).mint(tooSmall))
        .to.be.revertedWith("Amount too small");
    });
  });
});