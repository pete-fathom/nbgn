const { ethers } = require("hardhat");

async function main() {
  console.log("Starting GBGN Token deployment on Ethereum Mainnet...");
  
  // PAXG address on Ethereum Mainnet
  const PAXG_ADDRESS = "0x45804880De22913dAFE09f4980848ECE6EcbAf78";
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
  
  // Check current gas price
  const feeData = await deployer.provider.getFeeData();
  console.log("Current gas price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
  console.log("Max fee per gas:", ethers.formatUnits(feeData.maxFeePerGas, "gwei"), "gwei");
  console.log("Max priority fee:", ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei"), "gwei");
  
  // Deploy GBGN Token
  console.log("\nDeploying GBGN Token...");
  const GBGNToken = await ethers.getContractFactory("GBGNToken");
  
  // Estimate deployment gas
  const deploymentData = GBGNToken.interface.encodeDeploy([PAXG_ADDRESS]);
  const estimatedGas = await deployer.provider.estimateGas({
    data: GBGNToken.bytecode + deploymentData.slice(2),
    from: deployer.address
  });
  console.log("Estimated deployment gas:", estimatedGas.toString());
  
  const estimatedCost = estimatedGas * feeData.gasPrice;
  console.log("Estimated deployment cost:", ethers.formatEther(estimatedCost), "ETH");
  
  // Deploy with proper gas settings for mainnet
  const gbgn = await GBGNToken.deploy(PAXG_ADDRESS, {
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    gasLimit: estimatedGas * 110n / 100n // 10% buffer
  });
  
  await gbgn.waitForDeployment();
  
  const gbgnAddress = await gbgn.getAddress();
  console.log("GBGN Token deployed to:", gbgnAddress);
  console.log("PAXG address:", PAXG_ADDRESS);
  
  // Wait for confirmations
  console.log("\nWaiting for confirmations...");
  const deployTx = gbgn.deploymentTransaction();
  if (deployTx) {
    console.log("Transaction hash:", deployTx.hash);
    await deployTx.wait(2); // Wait for 2 confirmations on mainnet
  }
  
  // Verify contract information
  console.log("\nContract information:");
  console.log("- Name:", await gbgn.name());
  console.log("- Symbol:", await gbgn.symbol());
  console.log("- Decimals:", await gbgn.decimals());
  console.log("- GBGN per PAXG:", (await gbgn.GBGN_PER_PAXG()).toString());
  console.log("- Precision:", (await gbgn.PRECISION()).toString());
  
  // Calculate example conversions (accounting for PAXG fee)
  const examplePaxg = ethers.parseUnits("1", 18); // 1 PAXG
  const exampleGbgn = ethers.parseUnits("5600", 18); // 5600 GBGN
  
  console.log("\nExample conversions (with PAXG 0.02% fee):");
  console.log("- 1 PAXG =", ethers.formatUnits(await gbgn.calculateGbgnAmount(examplePaxg), 18), "GBGN (after fee)");
  
  const [paxgBefore, paxgAfter] = await gbgn.calculatePaxgAmount(exampleGbgn);
  console.log("- 5600 GBGN =", ethers.formatUnits(paxgBefore, 18), "PAXG (before fee)");
  console.log("- 5600 GBGN =", ethers.formatUnits(paxgAfter, 18), "PAXG (after fee)");
  
  // Verify on Etherscan
  if (network.name === "mainnet") {
    console.log("\nWaiting 30 seconds before verifying on Etherscan...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: gbgnAddress,
        constructorArguments: [PAXG_ADDRESS],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.error("Verification failed:", error.message);
      console.log("You can verify manually at https://etherscan.io/verifyContract");
    }
  }
  
  console.log("\nDeployment completed!");
  console.log("GBGN Token address:", gbgnAddress);
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    gbgnAddress: gbgnAddress,
    paxgAddress: PAXG_ADDRESS,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    exchangeRate: "1 PAXG = 5600 GBGN",
    notes: "PAXG has 0.02% transfer fee on all transfers"
  };
  
  console.log("\nDeployment info:", JSON.stringify(deploymentInfo, null, 2));
  
  // Additional mainnet-specific info
  console.log("\n⚠️  IMPORTANT REMINDERS:");
  console.log("1. PAXG charges 0.02% fee on ALL transfers (mint and redeem)");
  console.log("2. Ensure users understand they receive slightly less due to PAXG fees");
  console.log("3. Monitor gas prices on mainnet for optimal user experience");
  console.log("4. Consider implementing a UI that shows fee-adjusted amounts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });