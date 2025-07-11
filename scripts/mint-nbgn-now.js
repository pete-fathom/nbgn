const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Minting 5 EURC into NBGN...\n");
  
  const [signer] = await ethers.getSigners();
  const NBGN_ADDRESS = "0x731733Ee9c0C1b9850d39B56226548A61E4b04B4";
  const EURC_ADDRESS = "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c";
  
  // Contract ABIs
  const eurcABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)"
  ];
  const nbgnABI = [
    "function mint(uint256) returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function calculateNBGN(uint256) view returns (uint256)"
  ];
  
  const eurc = new ethers.Contract(EURC_ADDRESS, eurcABI, signer);
  const nbgn = new ethers.Contract(NBGN_ADDRESS, nbgnABI, signer);
  
  // Check current balances
  const eurcBalance = await eurc.balanceOf(signer.address);
  const nbgnBalanceBefore = await nbgn.balanceOf(signer.address);
  const ethBalance = await ethers.provider.getBalance(signer.address);
  
  console.log("💰 Current Balances:");
  console.log("ETH:", ethers.formatEther(ethBalance));
  console.log("EURC:", ethers.formatUnits(eurcBalance, 6));
  console.log("NBGN:", ethers.formatUnits(nbgnBalanceBefore, 18));
  
  // Check allowance
  const allowance = await eurc.allowance(signer.address, NBGN_ADDRESS);
  console.log("\n✅ EURC Allowance:", ethers.formatUnits(allowance, 6));
  
  // Amount to mint
  const eurcAmount = ethers.parseUnits("5", 6);
  const expectedNBGN = await nbgn.calculateNBGN(eurcAmount);
  console.log("\n💱 Conversion:");
  console.log("Input: 5 EURC");
  console.log("Expected: ", ethers.formatUnits(expectedNBGN, 18), "NBGN");
  
  // Get current gas price
  const feeData = await ethers.provider.getFeeData();
  console.log("\n⛽ Gas Price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
  
  // Mint NBGN
  console.log("\n🏭 Sending mint transaction...");
  try {
    const tx = await nbgn.mint(eurcAmount, {
      gasLimit: 200000, // Set explicit gas limit
      gasPrice: feeData.gasPrice
    });
    
    console.log("📨 TX Hash:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("\n✅ SUCCESS! Transaction confirmed!");
    console.log("Block:", receipt.blockNumber);
    console.log("Gas Used:", receipt.gasUsed.toString());
    
    // Check new balance
    const nbgnBalanceAfter = await nbgn.balanceOf(signer.address);
    const nbgnReceived = nbgnBalanceAfter - nbgnBalanceBefore;
    
    console.log("\n🎉 You received:", ethers.formatUnits(nbgnReceived, 18), "NBGN!");
    console.log("\n📊 Final Balances:");
    console.log("EURC:", ethers.formatUnits(await eurc.balanceOf(signer.address), 6));
    console.log("NBGN:", ethers.formatUnits(nbgnBalanceAfter, 18));
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });