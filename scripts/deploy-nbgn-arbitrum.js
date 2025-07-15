const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // EURe token address on Arbitrum One
  const EURE_ADDRESS = "0x0c06cCF38114ddfc35e07427B9424adcca9F44F8";
  
  console.log("🚀 Starting NBGN Token deployment to Arbitrum One...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInEth = ethers.formatEther(balance);
  console.log("Deployer balance:", balanceInEth, "ETH");
  
  if (parseFloat(balanceInEth) < 0.01) {
    throw new Error("Insufficient ETH balance. Need at least 0.01 ETH for deployment");
  }

  // Deploy NBGNToken contract
  console.log("\n📝 Deploying NBGNToken contract...");
  const NBGNToken = await ethers.getContractFactory("NBGNToken");
  const nbgnToken = await NBGNToken.deploy(EURE_ADDRESS);
  
  await nbgnToken.waitForDeployment();
  
  const contractAddress = await nbgnToken.getAddress();
  console.log("✅ NBGNToken deployed to:", contractAddress);
  
  // Get deployment transaction
  const deploymentTx = nbgnToken.deploymentTransaction();
  console.log("Deployment transaction hash:", deploymentTx.hash);
  
  // Wait for more confirmations
  console.log("\n⏳ Waiting for confirmations...");
  await deploymentTx.wait(3);
  
  // Verify contract details
  console.log("\n📊 Contract Details:");
  console.log("- Name:", await nbgnToken.name());
  console.log("- Symbol:", await nbgnToken.symbol());
  console.log("- Decimals:", await nbgnToken.decimals());
  console.log("- EURe Token:", await nbgnToken.eureToken());
  console.log("- BGN per EUR:", ethers.formatEther(await nbgnToken.BGN_PER_EUR()));
  
  console.log("\n✅ Deployment complete!");
  console.log("\n📋 Next steps:");
  console.log("1. Verify the contract on Arbiscan:");
  console.log(`   npx hardhat verify --network arbitrum ${contractAddress} "${EURE_ADDRESS}"`);
  console.log("2. Update .env with NBGN_TOKEN_ADDRESS");
  console.log("3. Test minting and redeeming functionality");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });