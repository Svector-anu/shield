import { ethers } from "hardhat";

async function main() {
  const Shield = await ethers.getContractFactory("Shield");
  const shield = await Shield.deploy();

  await shield.waitForDeployment();

  console.log(`Shield deployed to: ${await shield.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
