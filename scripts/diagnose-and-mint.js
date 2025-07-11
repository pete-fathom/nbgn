const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Diagnosing mint issue and retrying...\n");
  
  const [signer] = await ethers.getSigners();
  const NBGN_ADDRESS = "0x731733Ee9c0C1b9850d39B56226548A61E4b04B4";
  const EURC_ADDRESS = "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c";
  
  // Contract setup
  const eurcABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)"
  ];
  const nbgnABI = [
    "function mint(uint256) returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function calculateNBGN(uint256) view returns (uint256)"
  ];
  
  const eurc = new ethers.Contract(EURC_ADDRESS, eurcABI, signer);
  const nbgn = new ethers.Contract(NBGN_ADDRESS, nbgnABI, signer);
  
  // Check all balances and allowances
  const ethBalance = await ethers.provider.getBalance(signer.address);
  const eurcBalance = await eurc.balanceOf(signer.address);
  const nbgnBalance = await nbgn.balanceOf(signer.address);
  const allowance = await eurc.allowance(signer.address, NBGN_ADDRESS);
  
  console.log("💰 Current Status:");
  console.log("ETH:", ethers.formatEther(ethBalance));
  console.log("EURC:", ethers.formatUnits(eurcBalance, 6));
  console.log("NBGN:", ethers.formatUnits(nbgnBalance, 18));
  console.log("Allowance:", ethers.formatUnits(allowance, 6));
  
  // Check if we have enough EURC
  const eurcAmount = ethers.parseUnits("5", 6);
  if (eurcBalance < eurcAmount) {
    console.log("❌ Insufficient EURC balance!");
    return;
  }
  
  // Check/fix allowance
  if (allowance < eurcAmount) {
    console.log("\n🔧 Need to approve EURC first...");
    const feeData = await ethers.provider.getFeeData();
    const approveTx = await eurc.approve(NBGN_ADDRESS, eurcAmount, {
      gasPrice: feeData.gasPrice,
      gasLimit: 100000
    });
    console.log("Approval TX:", approveTx.hash);
    await approveTx.wait();
    console.log("✅ EURC approved!");
  }
  
  // Get current gas data
  const feeData = await ethers.provider.getFeeData();
  console.log("\n⛽ Network Gas Info:");
  console.log("Gas Price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
  console.log("Max Fee:", ethers.formatUnits(feeData.maxFeePerGas || feeData.gasPrice, "gwei"), "gwei");
  
  // Calculate expected NBGN
  const expectedNBGN = await nbgn.calculateNBGN(eurcAmount);
  console.log("\n💱 Expected Result:");
  console.log("5 EURC →", ethers.formatUnits(expectedNBGN, 18), "NBGN");
  
  // Try mint with higher gas price (1.5x current)
  const gasPrice = (feeData.gasPrice * 15n) / 10n; // 150% of current price
  console.log("\n🚀 Attempting mint with", ethers.formatUnits(gasPrice, "gwei"), "gwei...");
  
  try {
    const tx = await nbgn.mint(eurcAmount, {
      gasPrice: gasPrice,
      gasLimit: 250000 // Higher gas limit for safety
    });
    
    console.log("📨 TX Hash:", tx.hash);
    console.log("🔗 Etherscan:", `https://etherscan.io/tx/${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait(1); // Wait for 1 confirmation
    
    if (receipt.status === 1) {
      console.log("\n✅ SUCCESS! Transaction confirmed!");
      console.log("Block:", receipt.blockNumber);
      console.log("Gas Used:", receipt.gasUsed.toString());
      
      // Check final balance
      const finalNBGN = await nbgn.balanceOf(signer.address);
      const finalEURC = await eurc.balanceOf(signer.address);
      
      console.log("\n🎉 Final Balances:");
      console.log("EURC:", ethers.formatUnits(finalEURC, 6));
      console.log("NBGN:", ethers.formatUnits(finalNBGN, 18));
      console.log("\n💰 You now own", ethers.formatUnits(finalNBGN, 18), "NBGN tokens!");
      
    } else {
      console.log("❌ Transaction failed!");
    }
    
  } catch (error) {
    console.error("\n❌ Mint failed:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    
    // Check if it's a contract issue
    if (error.message.includes("CALL_EXCEPTION")) {
      console.log("\n🔍 Possible issues:");
      console.log("- Contract may be paused");
      console.log("- Insufficient EURC allowance");  
      console.log("- Contract logic error");
      
      // Test a simple contract call
      try {
        const rate = await nbgn.getConversionRate();
        console.log("✅ Contract is responsive, rate:", rate[0].toString());
      } catch (e) {
        console.log("❌ Contract not responding:", e.message);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script error:", error);
    process.exit(1);
  });