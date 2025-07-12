const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🔄 Upgrading NBGN contract on Arbitrum One...");
  
  const proxyAddress = "0xF5834Af69E2772604132f796f6ee08fd0f83C28a";
  
  const [deployer] = await ethers.getSigners();
  console.log("Upgrader address:", deployer.address);
  
  // Get the new contract factory
  const NBGNv2 = await ethers.getContractFactory("NBGN");
  
  console.log("🔍 Upgrading NBGN implementation...");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, NBGNv2);
  
  await upgraded.waitForDeployment();
  const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  
  console.log("✅ NBGN Proxy upgraded at:", proxyAddress);
  console.log("✅ New Implementation deployed to:", newImplementationAddress);
  
  // Verify the upgrade worked
  const conversionRate = await upgraded.getConversionRate();
  const eureToken = await upgraded.eureToken();
  
  console.log("\n📋 Updated Contract Details:");
  console.log("Conversion Rate:", conversionRate[0].toString(), "/", conversionRate[1].toString());
  console.log("EURe Token Address:", eureToken);
  
  // Test the calculation functions
  const testEureAmount = ethers.parseEther("1"); // 1 EURe (18 decimals)
  const expectedNbgn = await upgraded.calculateNBGN(testEureAmount);
  const backToEure = await upgraded.calculateEURe(expectedNbgn);
  
  console.log("\n🧮 Calculation Test:");
  console.log("1 EURe =", ethers.formatEther(expectedNbgn), "NBGN");
  console.log("Back to EURe:", ethers.formatEther(backToEure), "EURe");
  
  console.log("\n🎉 Upgrade completed successfully!");
  console.log("Contract now correctly handles 18-decimal EURe tokens.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Upgrade failed:", error);
    process.exit(1);
  });