const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing NBGN operations on Arbitrum...\n");
  
  const [signer] = await ethers.getSigners();
  console.log("Testing with account:", signer.address);
  
  // Contract addresses on Arbitrum
  const nbgnAddress = "0xF5834Af69E2772604132f796f6ee08fd0f83C28a"; // Update this if different
  const eureAddress = "0x0c06cCF38114ddfc35e07427B9424adcca9F44F8";
  const recipientAddress = "0xe9bb2Ff61e536ee96e6B88D7Ac99dE01b44d2F0F";
  
  // Get contract instances
  const nbgn = await ethers.getContractAt("NBGN", nbgnAddress);
  const eure = await ethers.getContractAt("IERC20Metadata", eureAddress);
  
  console.log("📊 Initial Balances:");
  const initialEureBalance = await eure.balanceOf(signer.address);
  const initialNbgnBalance = await nbgn.balanceOf(signer.address);
  const initialRecipientBalance = await nbgn.balanceOf(recipientAddress);
  
  console.log("Your EURe balance:", ethers.formatEther(initialEureBalance));
  console.log("Your NBGN balance:", ethers.formatEther(initialNbgnBalance));
  console.log("Recipient NBGN balance:", ethers.formatEther(initialRecipientBalance));
  
  if (initialEureBalance === 0n) {
    console.log("\n❌ You have no EURe tokens. Please get some EURe first!");
    return;
  }
  
  // Test 1: Buy NBGN with EURe
  console.log("\n🔵 Test 1: Buying NBGN with EURe");
  const eureAmount = ethers.parseEther("10"); // Buy with 10 EURe
  
  // First approve EURe spending
  console.log("Approving EURe spending...");
  const approveTx = await eure.approve(nbgnAddress, eureAmount);
  await approveTx.wait();
  console.log("✅ Approval successful");
  
  // Calculate expected NBGN amount
  const expectedNbgn = await nbgn.calculateNBGN(eureAmount);
  console.log("Expected NBGN amount:", ethers.formatEther(expectedNbgn));
  
  // Mint NBGN
  console.log("Minting NBGN...");
  const mintTx = await nbgn.mint(eureAmount);
  const mintReceipt = await mintTx.wait();
  console.log("✅ Mint successful, tx hash:", mintTx.hash);
  
  // Check new balance
  const postMintNbgnBalance = await nbgn.balanceOf(signer.address);
  const actualMinted = postMintNbgnBalance - initialNbgnBalance;
  console.log("Actually minted:", ethers.formatEther(actualMinted));
  
  // Test 2: Send 1 NBGN to recipient
  console.log("\n🔵 Test 2: Sending 1 NBGN to", recipientAddress);
  const sendAmount = ethers.parseEther("1");
  
  const transferTx = await nbgn.transfer(recipientAddress, sendAmount);
  const transferReceipt = await transferTx.wait();
  console.log("✅ Transfer successful, tx hash:", transferTx.hash);
  
  // Check balances after transfer
  const postTransferSenderBalance = await nbgn.balanceOf(signer.address);
  const postTransferRecipientBalance = await nbgn.balanceOf(recipientAddress);
  
  console.log("Your NBGN balance after transfer:", ethers.formatEther(postTransferSenderBalance));
  console.log("Recipient NBGN balance after transfer:", ethers.formatEther(postTransferRecipientBalance));
  
  // Test 3: Sell NBGN and redeem EURe
  console.log("\n🔵 Test 3: Selling NBGN and redeeming EURe");
  const redeemAmount = ethers.parseEther("5"); // Redeem 5 NBGN
  
  // Calculate expected EURe amount
  const expectedEure = await nbgn.calculateEURe(redeemAmount);
  console.log("Expected EURe amount:", ethers.formatEther(expectedEure));
  
  // Redeem
  console.log("Redeeming NBGN for EURe...");
  const redeemTx = await nbgn.redeem(redeemAmount);
  const redeemReceipt = await redeemTx.wait();
  console.log("✅ Redeem successful, tx hash:", redeemTx.hash);
  
  // Check final balances
  console.log("\n📊 Final Balances:");
  const finalEureBalance = await eure.balanceOf(signer.address);
  const finalNbgnBalance = await nbgn.balanceOf(signer.address);
  const finalRecipientBalance = await nbgn.balanceOf(recipientAddress);
  
  console.log("Your EURe balance:", ethers.formatEther(finalEureBalance));
  console.log("Your NBGN balance:", ethers.formatEther(finalNbgnBalance));
  console.log("Recipient NBGN balance:", ethers.formatEther(finalRecipientBalance));
  
  // Summary
  console.log("\n📈 Transaction Summary:");
  console.log("EURe spent:", ethers.formatEther(initialEureBalance - finalEureBalance));
  console.log("NBGN gained:", ethers.formatEther(finalNbgnBalance - initialNbgnBalance));
  console.log("NBGN sent to recipient:", ethers.formatEther(finalRecipientBalance - initialRecipientBalance));
  
  // Check collateral in contract
  const collateralBalance = await nbgn.getCollateralBalance();
  const totalCollateral = await nbgn.totalCollateral();
  console.log("\n🏦 Contract State:");
  console.log("Contract EURe balance:", ethers.formatEther(collateralBalance));
  console.log("Total collateral tracked:", ethers.formatEther(totalCollateral));
  
  // Verify calculations
  console.log("\n✨ Verifying Conversion Rate:");
  const [rate, precision] = await nbgn.getConversionRate();
  console.log("1 EUR = ", Number(rate) / Number(precision), "NBGN");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });