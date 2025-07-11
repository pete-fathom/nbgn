const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🚀 Deploying NBGN to Ethereum Mainnet...");
  console.log("⚠️  This will cost real ETH!");
  
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.055")) {
    throw new Error("Insufficient ETH balance for deployment");
  }
  
  // Estimate gas costs
  const NBGN = await ethers.getContractFactory("NBGN");
  const deploymentData = NBGN.interface.encodeDeploy([]);
  const gasEstimate = await ethers.provider.estimateGas({ data: deploymentData });
  
  console.log("Estimated gas for deployment:", gasEstimate.toString());
  console.log("Estimated cost:", ethers.formatEther(gasEstimate * 30000000000n), "ETH");
  
  // Deploy with confirmation
  console.log("\n🔍 Deploying NBGN implementation...");
  const nbgn = await upgrades.deployProxy(NBGN, [deployer.address], {
    initializer: "initialize",
    kind: "uups",
  });
  
  await nbgn.waitForDeployment();
  const nbgnAddress = await nbgn.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(nbgnAddress);
  
  console.log("✅ NBGN Proxy deployed to:", nbgnAddress);
  console.log("✅ Implementation deployed to:", implementationAddress);
  
  // Verify contract state
  const name = await nbgn.name();
  const symbol = await nbgn.symbol();
  const owner = await nbgn.owner();
  const conversionRate = await nbgn.getConversionRate();
  
  console.log("\n📋 Contract Details:");
  console.log("Name:", name);
  console.log("Symbol:", symbol);
  console.log("Owner:", owner);
  console.log("Conversion Rate:", conversionRate[0].toString(), "/", conversionRate[1].toString());
  
  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📝 Next steps:");
  console.log("1. Verify contracts on Etherscan");
  console.log("2. Transfer ownership to multisig");
  console.log("3. Set up monitoring");
  console.log("4. Conduct final security audit");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });