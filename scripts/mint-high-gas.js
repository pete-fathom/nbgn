const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Minting NBGN with HIGH GAS to guarantee confirmation...\n");
  
  const [signer] = await ethers.getSigners();
  const NBGN_ADDRESS = "0x731733Ee9c0C1b9850d39B56226548A61E4b04B4";
  
  // Set up contract
  const nbgnABI = ["function mint(uint256) returns (uint256)"];
  const nbgn = new ethers.Contract(NBGN_ADDRESS, nbgnABI, signer);
  
  // Get current gas info
  const feeData = await ethers.provider.getFeeData();
  const currentGas = feeData.gasPrice;
  
  // Use 3x current gas price for guaranteed fast confirmation
  const highGasPrice = currentGas * 3n;
  
  console.log("⛽ Gas Settings:");
  console.log("Current network:", ethers.formatUnits(currentGas, "gwei"), "gwei");
  console.log("Our gas price:", ethers.formatUnits(highGasPrice, "gwei"), "gwei");
  console.log("Estimated cost:", ethers.formatEther(highGasPrice * 200000n), "ETH");
  
  const eurcAmount = ethers.parseUnits("5", 6);
  
  console.log("\n🏭 Sending HIGH GAS mint transaction...");
  
  try {
    const tx = await nbgn.mint(eurcAmount, {
      gasPrice: highGasPrice,
      gasLimit: 300000, // Very high gas limit
      nonce: await signer.getNonce() // Get fresh nonce
    });
    
    console.log("✅ Transaction sent!");
    console.log("TX Hash:", tx.hash);
    console.log("Gas Price:", ethers.formatUnits(tx.gasPrice, "gwei"), "gwei");
    console.log("Etherscan:", `https://etherscan.io/tx/${tx.hash}`);
    
    console.log("\n⏳ Waiting for confirmation (should be fast with high gas)...");
    
    // Wait for confirmation
    const receipt = await tx.wait(1);
    
    if (receipt.status === 1) {
      console.log("\n🎉 SUCCESS! NBGN minted!");
      console.log("Block:", receipt.blockNumber);
      console.log("Gas Used:", receipt.gasUsed.toString());
      console.log("Gas Cost:", ethers.formatEther(receipt.gasUsed * tx.gasPrice), "ETH");
      
      console.log("\n✅ Check your MetaMask - you should now have ~9.77915 NBGN!");
    } else {
      console.log("❌ Transaction failed with status:", receipt.status);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log("\n💡 Need more ETH for gas. Current cost would be:");
      console.log("Max cost:", ethers.formatEther(highGasPrice * 300000n), "ETH");
    } else if (error.code === 'NONCE_EXPIRED') {
      console.log("\n🔄 Nonce issue - previous transaction might be stuck");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });