const { ethers } = require("hardhat");

async function main() {
  console.log("Checking EURe token decimals on Arbitrum...");
  
  const eureAddress = "0x0c06cCF38114ddfc35e07427B9424adcca9F44F8";
  
  // Create contract instance
  const eureToken = await ethers.getContractAt("IERC20Metadata", eureAddress);
  
  try {
    const decimals = await eureToken.decimals();
    const name = await eureToken.name();
    const symbol = await eureToken.symbol();
    
    console.log("Token Name:", name);
    console.log("Token Symbol:", symbol);
    console.log("Token Decimals:", decimals.toString());
    
    if (decimals === 18n) {
      console.log("✅ EURe uses 18 decimals - current DECIMAL_DIFFERENCE is correct");
    } else if (decimals === 6n) {
      console.log("⚠️  EURe uses 6 decimals - need to update DECIMAL_DIFFERENCE");
    } else {
      console.log("⚠️  EURe uses", decimals.toString(), "decimals - need to update calculations");
    }
    
  } catch (error) {
    console.error("Error checking token:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });