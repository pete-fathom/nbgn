const { run } = require("hardhat");

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS || "YOUR_PROXY_ADDRESS";
  const implementationAddress = process.env.IMPLEMENTATION_ADDRESS || "YOUR_IMPLEMENTATION_ADDRESS";
  
  console.log("Verifying NBGN implementation...");
  
  try {
    await run("verify:verify", {
      address: implementationAddress,
      constructorArguments: [],
    });
    console.log("✅ Implementation verified successfully");
  } catch (error) {
    console.log("❌ Implementation verification failed:", error.message);
  }
  
  console.log("Verifying NBGN proxy...");
  
  try {
    await run("verify:verify", {
      address: proxyAddress,
      constructorArguments: [],
    });
    console.log("✅ Proxy verified successfully");
  } catch (error) {
    console.log("❌ Proxy verification failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });