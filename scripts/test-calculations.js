const { ethers } = require("hardhat");

async function main() {
  console.log("🧮 Testing NBGN calculation functions...");
  
  const nbgnAddress = "0xF5834Af69E2772604132f796f6ee08fd0f83C28a";
  
  // Create contract instance
  const nbgn = await ethers.getContractAt("NBGN", nbgnAddress);
  
  try {
    // Test with 1 EURe (18 decimals)
    const oneEURe = ethers.parseEther("1"); // 1000000000000000000 (1 with 18 zeros)
    console.log("Input: 1 EURe =", oneEURe.toString(), "wei");
    
    const calculatedNBGN = await nbgn.calculateNBGN(oneEURe);
    console.log("Output: NBGN =", calculatedNBGN.toString(), "wei");
    console.log("Output: NBGN =", ethers.formatEther(calculatedNBGN), "tokens");
    
    // Check conversion constants
    const [rate, precision] = await nbgn.getConversionRate();
    console.log("\nConversion rate:", rate.toString(), "/", precision.toString());
    console.log("Rate as decimal:", Number(rate) / Number(precision));
    
    // Test reverse calculation
    const backToEURe = await nbgn.calculateEURe(calculatedNBGN);
    console.log("\nReverse calculation:");
    console.log("Back to EURe:", ethers.formatEther(backToEURe), "tokens");
    
    // Expected result: 1 EURe should give ~1.95583 NBGN
    const expected = 1.95583;
    const actual = Number(ethers.formatEther(calculatedNBGN));
    console.log("\n📊 Results:");
    console.log("Expected: ~", expected, "NBGN");
    console.log("Actual:", actual, "NBGN");
    console.log("Difference:", Math.abs(actual - expected));
    
    if (Math.abs(actual - expected) < 0.001) {
      console.log("✅ Calculations are correct!");
    } else {
      console.log("❌ Calculations are WRONG!");
    }
    
  } catch (error) {
    console.error("Error testing calculations:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });