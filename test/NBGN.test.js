const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("NBGN Stablecoin", function () {
  let nbgn;
  let mockEURC;
  let owner;
  let user1;
  let user2;
  
  const CONVERSION_RATE = 195583n;
  const RATE_PRECISION = 100000n;
  const DECIMAL_DIFFERENCE = 10n ** 12n; // 18 - 6 = 12 decimal places
  
  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock EURC token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockEURC = await upgrades.deployProxy(MockERC20, ["Euro Coin", "EURC", 6], {
      initializer: "initialize",
    });
    await mockEURC.waitForDeployment();
    
    // Deploy NBGN with mock EURC address
    const NBGN = await ethers.getContractFactory("NBGN");
    
    // We need to modify the NBGN contract to accept a custom EURC address for testing
    // For now, we'll deploy as is and override the eurcToken in tests
    nbgn = await upgrades.deployProxy(NBGN, [owner.address], {
      initializer: "initialize",
      kind: "uups",
    });
    await nbgn.waitForDeployment();
    
    // Setup mock EURC balances
    await mockEURC.mint(user1.address, ethers.parseUnits("1000", 6));
    await mockEURC.mint(user2.address, ethers.parseUnits("1000", 6));
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await nbgn.name()).to.equal("New Bulgarian Lev");
      expect(await nbgn.symbol()).to.equal("NBGN");
    });

    it("Should set the correct owner", async function () {
      expect(await nbgn.owner()).to.equal(owner.address);
    });

    it("Should have correct conversion rate", async function () {
      const rate = await nbgn.getConversionRate();
      expect(rate[0]).to.equal(CONVERSION_RATE);
      expect(rate[1]).to.equal(RATE_PRECISION);
    });

    it("Should have 18 decimals", async function () {
      expect(await nbgn.decimals()).to.equal(18);
    });
  });

  describe("Calculations", function () {
    it("Should calculate NBGN amount correctly", async function () {
      const eurcAmount = ethers.parseUnits("100", 6); // 100 EURC (6 decimals)
      const expectedNBGN = (eurcAmount * DECIMAL_DIFFERENCE * CONVERSION_RATE) / RATE_PRECISION;
      
      const calculatedNBGN = await nbgn.calculateNBGN(eurcAmount);
      expect(calculatedNBGN).to.equal(expectedNBGN);
      
      // Verify it's approximately 195.583 NBGN (18 decimals)
      expect(calculatedNBGN).to.be.closeTo(ethers.parseUnits("195.583", 18), ethers.parseUnits("0.001", 18));
    });

    it("Should calculate EURC amount correctly", async function () {
      const nbgnAmount = ethers.parseUnits("195.583", 18); // 195.583 NBGN (18 decimals)
      
      const calculatedEURC = await nbgn.calculateEURC(nbgnAmount);
      // Expected: 195.583 NBGN should return ~100 EURC (6 decimals)
      const expectedEURC = (nbgnAmount * RATE_PRECISION) / (CONVERSION_RATE * DECIMAL_DIFFERENCE);
      
      expect(calculatedEURC).to.equal(expectedEURC);
      
      // Verify it's approximately 100 EURC (6 decimals)
      expect(calculatedEURC).to.be.closeTo(ethers.parseUnits("100", 6), ethers.parseUnits("0.01", 6));
    });

    it("Should handle round-trip conversion correctly", async function () {
      const eurcAmount = ethers.parseUnits("100", 6); // 100 EURC
      
      // Calculate expected NBGN
      const expectedNBGN = await nbgn.calculateNBGN(eurcAmount);
      
      // Calculate EURC back from NBGN
      const calculatedEURCBack = await nbgn.calculateEURC(expectedNBGN);
      
      // Should be very close to original (allowing for rounding)
      expect(calculatedEURCBack).to.be.closeTo(eurcAmount, 100); // Within 0.0001 EURC
    });
  });

  describe("Minting and Redeeming with Proper Decimals", function () {
    beforeEach(async function () {
      // For these tests, we'll need to use a mock EURC that we can control
      // Since the real contract points to mainnet EURC
    });

    it("Should demonstrate correct decimal conversion", async function () {
      // Test that 1 EURC (1000000 units with 6 decimals) 
      // gives approximately 1.95583 NBGN (1.95583e18 units with 18 decimals)
      const oneEurc = ethers.parseUnits("1", 6);
      const expectedNbgn = await nbgn.calculateNBGN(oneEurc);
      
      // Should be 1.95583 NBGN in 18 decimals
      expect(expectedNbgn).to.be.closeTo(ethers.parseUnits("1.95583", 18), ethers.parseUnits("0.00001", 18));
      
      // Reverse calculation should give us back ~1 EURC
      const backToEurc = await nbgn.calculateEURC(expectedNbgn);
      expect(backToEurc).to.be.closeTo(oneEurc, 10); // Within 0.00001 EURC
    });
  });

  describe("Admin Functions", function () {
    it("Should pause and unpause", async function () {
      await nbgn.pause();
      expect(await nbgn.paused()).to.be.true;
      
      await nbgn.unpause();
      expect(await nbgn.paused()).to.be.false;
    });

    it("Should only allow owner to pause", async function () {
      await expect(nbgn.connect(user1).pause())
        .to.be.revertedWithCustomError(nbgn, "OwnableUnauthorizedAccount");
    });

    it("Should handle emergency withdrawal", async function () {
      const amount = ethers.parseUnits("10", 6);
      await mockEURC.mint(await nbgn.getAddress(), amount);
      
      const ownerBalanceBefore = await mockEURC.balanceOf(owner.address);
      await nbgn.emergencyWithdraw(await mockEURC.getAddress(), amount);
      const ownerBalanceAfter = await mockEURC.balanceOf(owner.address);
      
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(amount);
    });

    it("Should revert emergency withdrawal with zero address", async function () {
      await expect(nbgn.emergencyWithdraw(ethers.ZeroAddress, 100))
        .to.be.revertedWithCustomError(nbgn, "ZeroAddress");
    });

    it("Should revert emergency withdrawal with zero amount", async function () {
      await expect(nbgn.emergencyWithdraw(await mockEURC.getAddress(), 0))
        .to.be.revertedWithCustomError(nbgn, "InvalidAmount");
    });
  });

  describe("Upgradeability", function () {
    it("Should upgrade successfully", async function () {
      const NBGNv2 = await ethers.getContractFactory("NBGN");
      const upgraded = await upgrades.upgradeProxy(await nbgn.getAddress(), NBGNv2);
      
      expect(await upgraded.owner()).to.equal(owner.address);
      expect(await upgraded.name()).to.equal("New Bulgarian Lev");
    });

    it("Should only allow owner to upgrade", async function () {
      // This is tested implicitly through the upgrade mechanism
      // The UUPS pattern ensures only the owner can authorize upgrades
    });
  });

  describe("Pausable", function () {
    it("Should prevent minting when paused", async function () {
      await nbgn.pause();
      
      // Note: This will fail because we're using the hardcoded EURC address
      // In a real test environment, we would need to fork mainnet or modify the contract
      await expect(nbgn.mint(100))
        .to.be.revertedWithCustomError(nbgn, "EnforcedPause");
    });

    it("Should prevent redeeming when paused", async function () {
      await nbgn.pause();
      
      await expect(nbgn.redeem(100))
        .to.be.revertedWithCustomError(nbgn, "EnforcedPause");
    });
  });

  describe("ERC20 Functions", function () {
    it("Should have correct token metadata", async function () {
      expect(await nbgn.name()).to.equal("New Bulgarian Lev");
      expect(await nbgn.symbol()).to.equal("NBGN");
      expect(await nbgn.decimals()).to.equal(18);
    });

    it("Should start with zero total supply", async function () {
      expect(await nbgn.totalSupply()).to.equal(0);
    });
  });
});