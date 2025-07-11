const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking NBGN and EURC balances...\n");
  
  const [signer] = await ethers.getSigners();
  
  // Contract addresses
  const NBGN_ADDRESS = "0x731733Ee9c0C1b9850d39B56226548A61E4b04B4";
  const EURC_ADDRESS = "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c";
  
  // Get contract instances
  const eurcABI = ["function balanceOf(address account) external view returns (uint256)"];
  const nbgnABI = ["function balanceOf(address account) external view returns (uint256)"];
  
  const eurc = new ethers.Contract(EURC_ADDRESS, eurcABI, signer);
  const nbgn = new ethers.Contract(NBGN_ADDRESS, nbgnABI, signer);
  
  // Check balances
  const eurcBalance = await eurc.balanceOf(signer.address);
  const nbgnBalance = await nbgn.balanceOf(signer.address);
  
  console.log("💰 Wallet:", signer.address);
  console.log("🪙  EURC Balance:", ethers.formatUnits(eurcBalance, 6), "EURC");
  console.log("💵 NBGN Balance:", ethers.formatUnits(nbgnBalance, 18), "NBGN");
  
  // Transaction links
  console.log("\n📝 Recent Transactions:");
  console.log("Approval: https://etherscan.io/tx/0x6769d5e672f8a02ad03644801711d42e6f482e246b2077b749edf584ef703e72");
  console.log("Mint: https://etherscan.io/tx/0xfed9b096bc62cac745e2255311ea6b85f8ede95dd24b7cfb0b843e72e3dc3a7c");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });