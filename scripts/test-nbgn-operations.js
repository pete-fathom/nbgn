const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing NBGN operations on Arbitrum...\n");
  
  const [signer] = await ethers.getSigners();
  console.log("Testing with account:", signer.address);
  
  // Live contract addresses on Arbitrum
  const nbgnAddress = "0x47F9CF7043C8A059f82a988C0B9fF73F0c3e6067";
  const eureAddress = "0x0c06cCF38114ddfc35e07427B9424adcca9F44F8";
  
  // Contract ABIs
  const nbgnABI = [
    "function mint(uint256 eureAmount) external returns (uint256)",
    "function redeem(uint256 nbgnAmount) external returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function calculateNbgnAmount(uint256 eureAmount) external pure returns (uint256)",
    "function calculateEureAmount(uint256 nbgnAmount) external pure returns (uint256)",
    "function totalEureReserves() external view returns (uint256)",
    "function getReserveRatio() external view returns (uint256)"
  ];
  
  const eureABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function transfer(address to, uint256 amount) external returns (bool)"
  ];
  
  // Get contract instances
  const nbgn = new ethers.Contract(nbgnAddress, nbgnABI, signer);
  const eure = new ethers.Contract(eureAddress, eureABI, signer);
  
  console.log("📊 Initial Balances:");
  const initialEureBalance = await eure.balanceOf(signer.address);
  const initialNbgnBalance = await nbgn.balanceOf(signer.address);
  
  console.log("Your EURe balance:", ethers.formatEther(initialEureBalance));
  console.log("Your NBGN balance:", ethers.formatEther(initialNbgnBalance));
  
  if (initialEureBalance === 0n && initialNbgnBalance === 0n) {
    console.log("\n❌ You have no EURe tokens and no NBGN tokens. Please get some EURe first!");
    return;
  }
  
  let actualMinted = 0n;
  
  // Test 1: Buy 1 NBGN with EURe (only if we have EURe)
  if (initialEureBalance > 0n) {
    console.log("\n🔵 Test 1: Buying 1 NBGN with EURe");
    const eureAmount = ethers.parseEther("1"); // Buy with 1 EURe
    
    // Calculate expected NBGN amount
    const expectedNbgn = await nbgn.calculateNbgnAmount(eureAmount);
    console.log("Expected NBGN amount:", ethers.formatEther(expectedNbgn));
    
    // Check current allowance
    const currentAllowance = await eure.allowance(signer.address, nbgnAddress);
    console.log("Current EURe allowance:", ethers.formatEther(currentAllowance));
    
    // Approve EURe spending if needed
    if (currentAllowance < eureAmount) {
      console.log("Approving EURe spending...");
      const approveTx = await eure.approve(nbgnAddress, eureAmount);
      await approveTx.wait();
      console.log("✅ Approval successful");
    } else {
      console.log("✅ EURe already approved");
    }
    
    // Mint NBGN
    console.log("Minting NBGN...");
    const mintTx = await nbgn.mint(eureAmount);
    const mintReceipt = await mintTx.wait();
    console.log("✅ Mint successful, tx hash:", mintTx.hash);
    
    // Check new balance
    const postMintNbgnBalance = await nbgn.balanceOf(signer.address);
    actualMinted = postMintNbgnBalance - initialNbgnBalance;
    console.log("Actually minted:", ethers.formatEther(actualMinted), "NBGN");
  } else {
    console.log("\n⚠️  Skipping Test 1: No EURe tokens available");
  }
  
  // Test 2: Redeem NBGN back to EURe (use existing NBGN if no new minting)
  console.log("\n🔵 Test 2: Redeeming NBGN back to EURe");
  const currentNbgnBalance = await nbgn.balanceOf(signer.address);
  const redeemAmount = actualMinted > 0n ? actualMinted : ethers.parseEther("1"); // Redeem 1 NBGN if we have it
  
  if (currentNbgnBalance >= redeemAmount) {
    // Calculate expected EURe amount
    const expectedEure = await nbgn.calculateEureAmount(redeemAmount);
    console.log("Expected EURe amount:", ethers.formatEther(expectedEure));
    
    // Redeem
    console.log("Redeeming NBGN for EURe...");
    const redeemTx = await nbgn.redeem(redeemAmount);
    const redeemReceipt = await redeemTx.wait();
    console.log("✅ Redeem successful, tx hash:", redeemTx.hash);
  } else {
    console.log("⚠️  Insufficient NBGN balance for redemption");
    console.log("Available NBGN:", ethers.formatEther(currentNbgnBalance));
    console.log("Needed for redemption:", ethers.formatEther(redeemAmount));
  }
  
  // Check final balances
  console.log("\n📊 Final Balances:");
  const finalEureBalance = await eure.balanceOf(signer.address);
  const finalNbgnBalance = await nbgn.balanceOf(signer.address);
  
  console.log("Your EURe balance:", ethers.formatEther(finalEureBalance));
  console.log("Your NBGN balance:", ethers.formatEther(finalNbgnBalance));
  
  // Summary
  console.log("\n📈 Transaction Summary:");
  const eureChange = finalEureBalance - initialEureBalance;
  const nbgnChange = finalNbgnBalance - initialNbgnBalance;
  console.log("Net EURe change:", ethers.formatEther(eureChange));
  console.log("Net NBGN change:", ethers.formatEther(nbgnChange));
  
  // Check contract state
  const totalReserves = await nbgn.totalEureReserves();
  const reserveRatio = await nbgn.getReserveRatio();
  console.log("\n🏦 Contract State:");
  console.log("Total EURe reserves:", ethers.formatEther(totalReserves));
  console.log("Reserve ratio:", ethers.formatEther(reserveRatio), "(1.0 = 100%)");
  
  // Verify calculations
  console.log("\n✨ Conversion Rate Verification:");
  console.log("1 EUR = 1.95583 BGN (fixed rate)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });