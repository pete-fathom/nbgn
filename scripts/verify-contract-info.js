const { ethers } = require("hardhat");

async function main() {
  const nbgnAddress = "0xF5834Af69E2772604132f796f6ee08fd0f83C28a";
  const addressToCheck = "0x6447b1874b56a223eEa2E6faFA2D1442075Fbec7";
  
  try {
    const nbgn = await ethers.getContractAt("NBGN", nbgnAddress);
    
    // Get contract info
    const name = await nbgn.name();
    const symbol = await nbgn.symbol();
    const decimals = await nbgn.decimals();
    const totalSupply = await nbgn.totalSupply();
    const owner = await nbgn.owner();
    
    console.log("📋 NBGN Contract Info:");
    console.log("Address:", nbgnAddress);
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Decimals:", decimals);
    console.log("Total Supply:", ethers.formatEther(totalSupply));
    console.log("Owner:", owner);
    
    // Check balance
    const balance = await nbgn.balanceOf(addressToCheck);
    console.log("\n💰 Balance:");
    console.log(`${addressToCheck}: ${ethers.formatEther(balance)} NBGN`);
    
    // Check if contract exists at address
    const code = await ethers.provider.getCode(nbgnAddress);
    console.log("\n🔍 Contract verification:");
    console.log("Has code:", code !== "0x");
    console.log("Code length:", code.length);
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });