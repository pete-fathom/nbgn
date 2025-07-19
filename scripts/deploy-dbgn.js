const { ethers } = require("hardhat");

async function main() {
  console.log("Starting DBGN Token deployment...");
  
  // Native USDC address on Arbitrum One (not USDC.e)
  const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
  
  // Deploy DBGN Token
  console.log("\nDeploying DBGN Token...");
  const DBGNToken = await ethers.getContractFactory("DBGNToken");
  const dbgn = await DBGNToken.deploy(USDC_ADDRESS);
  await dbgn.waitForDeployment();
  
  const dbgnAddress = await dbgn.getAddress();
  console.log("DBGN Token deployed to:", dbgnAddress);
  console.log("USDC address:", USDC_ADDRESS);
  
  // Wait for confirmations
  console.log("\nWaiting for confirmations...");
  const deployTx = dbgn.deploymentTransaction();
  if (deployTx) {
    await deployTx.wait(5);
  }
  
  // Verify contract information
  console.log("\nContract information:");
  console.log("- Name:", await dbgn.name());
  console.log("- Symbol:", await dbgn.symbol());
  console.log("- Decimals:", await dbgn.decimals());
  console.log("- USDC per DBGN:", ethers.formatUnits(await dbgn.USDC_PER_DBGN(), 18));
  console.log("- Precision:", (await dbgn.PRECISION()).toString());
  
  // Calculate example conversions
  const exampleUsdc = ethers.parseUnits("100", 6); // 100 USDC
  const exampleDbgn = ethers.parseUnits("100", 18); // 100 DBGN
  
  console.log("\nExample conversions:");
  console.log("- 100 USDC =", ethers.formatUnits(await dbgn.calculateDbgnAmount(exampleUsdc), 18), "DBGN");
  console.log("- 100 DBGN =", ethers.formatUnits(await dbgn.calculateUsdcAmount(exampleDbgn), 6), "USDC");
  
  // Verify on Arbiscan
  if (network.name === "arbitrum") {
    console.log("\nVerifying contract on Arbiscan...");
    try {
      await hre.run("verify:verify", {
        address: dbgnAddress,
        constructorArguments: [USDC_ADDRESS],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.error("Verification failed:", error);
    }
  }
  
  console.log("\nDeployment completed!");
  console.log("DBGN Token address:", dbgnAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    dbgnAddress: dbgnAddress,
    usdcAddress: USDC_ADDRESS,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    exchangeRate: "1 DBGN = 0.60 USDC"
  };
  
  console.log("\nDeployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });