const { ethers } = require("hardhat");

async function main() {
  const addressToCheck = "0x6447b1874b56a223eEa2E6faFA2D1442075Fbec7";
  const nbgnAddress = "0xF5834Af69E2772604132f796f6ee08fd0f83C28a";
  
  const nbgn = await ethers.getContractAt("NBGN", nbgnAddress);
  
  const balance = await nbgn.balanceOf(addressToCheck);
  
  console.log(`NBGN balance of ${addressToCheck}:`);
  console.log(`${ethers.formatEther(balance)} NBGN`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });