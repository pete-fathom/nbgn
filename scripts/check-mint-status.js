const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking mint transaction status...\n");
  
  const provider = ethers.provider;
  const mintTxHash = "0xfed9b096bc62cac745e2255311ea6b85f8ede95dd24b7cfb0b843e72e3dc3a7c";
  
  try {
    // Check transaction status
    const tx = await provider.getTransaction(mintTxHash);
    const receipt = await provider.getTransactionReceipt(mintTxHash);
    
    if (receipt) {
      console.log("✅ Transaction confirmed!");
      console.log("Block:", receipt.blockNumber);
      console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
      console.log("Gas Used:", receipt.gasUsed.toString());
    } else if (tx) {
      console.log("⏳ Transaction pending...");
      console.log("Gas Price:", ethers.formatUnits(tx.gasPrice, "gwei"), "gwei");
      console.log("Current gas prices: https://ethgasstation.info/");
      
      // Get current gas price
      const currentGasPrice = await provider.getFeeData();
      console.log("\nCurrent Network Gas Price:", ethers.formatUnits(currentGasPrice.gasPrice, "gwei"), "gwei");
      
      if (currentGasPrice.gasPrice > tx.gasPrice) {
        console.log("\n⚠️  Your transaction gas price is below current network price.");
        console.log("Consider speeding up the transaction in MetaMask.");
      }
    } else {
      console.log("❓ Transaction not found. It may have been dropped.");
    }
    
    // Let's also check if we can manually mint with higher gas
    const [signer] = await ethers.getSigners();
    console.log("\n💡 Alternative: Try minting again with higher gas price");
    console.log("Current wallet balance:", ethers.formatEther(await provider.getBalance(signer.address)), "ETH");
    
  } catch (error) {
    console.error("Error checking transaction:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });