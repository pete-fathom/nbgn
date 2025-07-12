const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking mint issue...\n");
  
  const [signer] = await ethers.getSigners();
  const nbgnAddress = "0xF5834Af69E2772604132f796f6ee08fd0f83C28a";
  const eureAddress = "0x0c06cCF38114ddfc35e07427B9424adcca9F44F8";
  
  const nbgn = await ethers.getContractAt("NBGN", nbgnAddress);
  const eure = await ethers.getContractAt("IERC20Metadata", eureAddress);
  
  console.log("Your address:", signer.address);
  
  // Check balances
  const eureBalance = await eure.balanceOf(signer.address);
  const nbgnBalance = await nbgn.balanceOf(signer.address);
  const allowance = await eure.allowance(signer.address, nbgnAddress);
  
  console.log("EURe balance:", ethers.formatEther(eureBalance));
  console.log("NBGN balance:", ethers.formatEther(nbgnBalance));
  console.log("EURe allowance to NBGN:", ethers.formatEther(allowance));
  
  // Check contract state
  const isPaused = await nbgn.paused();
  const owner = await nbgn.owner();
  const collateralBalance = await nbgn.getCollateralBalance();
  
  console.log("\nContract state:");
  console.log("Is paused:", isPaused);
  console.log("Owner:", owner);
  console.log("Contract EURe balance:", ethers.formatEther(collateralBalance));
  
  // Try to mint a small amount
  const testAmount = ethers.parseEther("0.1");
  
  if (eureBalance < testAmount) {
    console.log("\n❌ Insufficient EURe balance");
    return;
  }
  
  try {
    // Check if we need approval
    if (allowance < testAmount) {
      console.log("\n🔄 Approving EURe...");
      const approveTx = await eure.approve(nbgnAddress, testAmount);
      await approveTx.wait();
      console.log("✅ Approved");
    }
    
    console.log("\n🔄 Attempting to mint with 0.1 EURe...");
    const expectedNbgn = await nbgn.calculateNBGN(testAmount);
    console.log("Expected NBGN:", ethers.formatEther(expectedNbgn));
    
    // Try to estimate gas first
    try {
      const gasEstimate = await nbgn.mint.estimateGas(testAmount);
      console.log("Gas estimate:", gasEstimate.toString());
    } catch (gasError) {
      console.log("❌ Gas estimation failed:", gasError.message);
      
      // Try to get more specific error
      try {
        await nbgn.mint.staticCall(testAmount);
      } catch (callError) {
        console.log("❌ Static call failed:", callError.message);
        if (callError.data) {
          console.log("Error data:", callError.data);
        }
      }
    }
    
    // If gas estimation succeeded, try the actual mint
    const mintTx = await nbgn.mint(testAmount);
    const receipt = await mintTx.wait();
    console.log("✅ Mint successful!");
    console.log("Transaction hash:", mintTx.hash);
    
  } catch (error) {
    console.log("\n❌ Error during mint:", error.message);
    if (error.reason) {
      console.log("Reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });