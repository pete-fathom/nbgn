const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Minting NBGN with current gas prices...\n");
  
  const [signer] = await ethers.getSigners();
  const NBGN_ADDRESS = "0x731733Ee9c0C1b9850d39B56226548A61E4b04B4";
  const EURC_ADDRESS = "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c";
  
  // Check allowance first
  const eurcABI = ["function allowance(address owner, address spender) external view returns (uint256)"];
  const eurc = new ethers.Contract(EURC_ADDRESS, eurcABI, signer);
  const allowance = await eurc.allowance(signer.address, NBGN_ADDRESS);
  
  console.log("✅ EURC Allowance:", ethers.formatUnits(allowance, 6), "EURC");
  
  if (allowance == 0) {
    console.log("❌ No allowance! Run the buy-nbgn script first.");
    return;
  }
  
  // Get current gas price
  const feeData = await ethers.provider.getFeeData();
  console.log("⛽ Current gas price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
  
  // Mint with current gas price
  const nbgnABI = ["function mint(uint256 _eurcAmount) external returns (uint256)"];
  const nbgn = new ethers.Contract(NBGN_ADDRESS, nbgnABI, signer);
  
  const eurcAmount = ethers.parseUnits("5", 6); // 5 EURC
  
  console.log("\n🏭 Minting NBGN...");
  try {
    const tx = await nbgn.mint(eurcAmount, {
      gasPrice: feeData.gasPrice // Use current network gas price
    });
    console.log("✅ Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Mint successful!");
    console.log("Block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 You need more ETH for gas. Current balance:", 
        ethers.formatEther(await ethers.provider.getBalance(signer.address)), "ETH");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });