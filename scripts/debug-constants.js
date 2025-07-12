const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging NBGN contract constants...");
  
  const nbgnAddress = "0xF5834Af69E2772604132f796f6ee08fd0f83C28a";
  
  // Create contract instance
  const nbgn = await ethers.getContractAt("NBGN", nbgnAddress);
  
  try {
    // Test the actual calculation with detailed breakdown
    const oneEURe = ethers.parseEther("1"); // 1e18
    console.log("Input EURe:", oneEURe.toString());
    
    // Get conversion rate constants
    const [rate, precision] = await nbgn.getConversionRate();
    console.log("CONVERSION_RATE:", rate.toString());
    console.log("RATE_PRECISION:", precision.toString());
    
    // Manual calculation to debug
    // The formula should be: (_eureAmount * DECIMAL_DIFFERENCE * CONVERSION_RATE) / RATE_PRECISION
    
    // Let's call calculateNBGN and see what we get
    const result = await nbgn.calculateNBGN(oneEURe);
    console.log("Contract result:", result.toString());
    
    // Expected with DECIMAL_DIFFERENCE = 1:
    // 1000000000000000000 * 1 * 195583 / 100000 = 1955830000000000000
    const expected = (oneEURe * rate) / precision;
    console.log("Expected result:", expected.toString());
    
    console.log("Ratio (actual/expected):", Number(result) / Number(expected));
    
    // If ratio is 1e12, then DECIMAL_DIFFERENCE is probably still 1e12 instead of 1
    if (Number(result) / Number(expected) > 1e10) {
      console.log("❌ DECIMAL_DIFFERENCE is likely still set to 10^12 instead of 1!");
      console.log("The contract wasn't properly upgraded.");
    } else {
      console.log("✅ DECIMAL_DIFFERENCE appears correct.");
    }
    
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