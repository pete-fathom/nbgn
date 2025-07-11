const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("Deploying NBGN to Sepolia testnet...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy NBGN implementation and proxy
  const NBGN = await ethers.getContractFactory("NBGN");
  
  console.log("Deploying NBGN proxy...");
  const nbgn = await upgrades.deployProxy(NBGN, [deployer.address], {
    initializer: "initialize",
    kind: "uups",
  });
  
  await nbgn.waitForDeployment();
  const nbgnAddress = await nbgn.getAddress();
  
  console.log("NBGN deployed to:", nbgnAddress);
  console.log("Implementation deployed to:", await upgrades.erc1967.getImplementationAddress(nbgnAddress));
  
  // Verify basic functionality
  const conversionRate = await nbgn.getConversionRate();
  console.log("Conversion rate:", conversionRate[0].toString(), "/", conversionRate[1].toString());
  
  console.log("\nDeployment completed successfully!");
  console.log("Save these addresses for verification:");
  console.log("Proxy:", nbgnAddress);
  console.log("Implementation:", await upgrades.erc1967.getImplementationAddress(nbgnAddress));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });