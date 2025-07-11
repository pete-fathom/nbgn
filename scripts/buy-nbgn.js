const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Buying NBGN with 5 EURC...\n");
  
  const [signer] = await ethers.getSigners();
  console.log("Using wallet:", signer.address);
  
  // Contract addresses
  const NBGN_ADDRESS = "0x731733Ee9c0C1b9850d39B56226548A61E4b04B4";
  const EURC_ADDRESS = "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c";
  
  // Get contract instances
  const eurcABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function allowance(address owner, address spender) external view returns (uint256)"
  ];
  
  const nbgnABI = [
    "function mint(uint256 _eurcAmount) external returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function calculateNBGN(uint256 _eurcAmount) external pure returns (uint256)"
  ];
  
  const eurc = new ethers.Contract(EURC_ADDRESS, eurcABI, signer);
  const nbgn = new ethers.Contract(NBGN_ADDRESS, nbgnABI, signer);
  
  // Amount to convert: 5 EURC
  const eurcAmount = ethers.parseUnits("5", 6); // 5 EURC (6 decimals)
  
  console.log("📊 Pre-Transaction Balances:");
  const eurcBalance = await eurc.balanceOf(signer.address);
  const nbgnBalance = await nbgn.balanceOf(signer.address);
  console.log("EURC Balance:", ethers.formatUnits(eurcBalance, 6));
  console.log("NBGN Balance:", ethers.formatUnits(nbgnBalance, 18));
  
  // Calculate expected NBGN
  const expectedNBGN = await nbgn.calculateNBGN(eurcAmount);
  console.log("\n💱 Conversion Preview:");
  console.log("Input: 5 EURC");
  console.log("Expected Output:", ethers.formatUnits(expectedNBGN, 18), "NBGN");
  
  // Check current allowance
  const currentAllowance = await eurc.allowance(signer.address, NBGN_ADDRESS);
  console.log("\n🔍 Current EURC Allowance:", ethers.formatUnits(currentAllowance, 6));
  
  // Step 1: Approve EURC if needed
  if (currentAllowance < eurcAmount) {
    console.log("\n✅ Step 1: Approving EURC spending...");
    const approveTx = await eurc.approve(NBGN_ADDRESS, eurcAmount);
    console.log("Approval TX:", approveTx.hash);
    await approveTx.wait();
    console.log("✅ Approval confirmed!");
  } else {
    console.log("\n✅ EURC already approved!");
  }
  
  // Step 2: Mint NBGN
  console.log("\n🏭 Step 2: Minting NBGN...");
  const mintTx = await nbgn.mint(eurcAmount);
  console.log("Mint TX:", mintTx.hash);
  const receipt = await mintTx.wait();
  console.log("✅ Mint confirmed!");
  
  // Show final balances
  console.log("\n📊 Post-Transaction Balances:");
  const newEurcBalance = await eurc.balanceOf(signer.address);
  const newNbgnBalance = await nbgn.balanceOf(signer.address);
  console.log("EURC Balance:", ethers.formatUnits(newEurcBalance, 6));
  console.log("NBGN Balance:", ethers.formatUnits(newNbgnBalance, 18));
  
  console.log("\n🎉 Success! You've purchased", ethers.formatUnits(newNbgnBalance - nbgnBalance, 18), "NBGN!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });